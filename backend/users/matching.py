"""
StudyBuddy AI — Global Student Recommendation & Weighted Compatibility Engine

Implements platform-wide global student matching according to:
- Factor weights configuration (sum = 100%)
- Normalized 0-100 scoring for each individual compatibility dimension
- Global retrieval excluding requesting user and users without questionnaires
- Deduplication using latest valid questionnaire responses
- Bidirectional knowledge, schedule, goal, and accountability synergy evaluation
"""

import re
from typing import List, Dict, Any, Set, Tuple
from django.contrib.auth.models import User
from .models import QuestionnaireResponse, StudentProfile


# ============================================================================
# 1. CENTRALIZED WEIGHTS CONFIGURATION (Total = 100% / 1.00)
# ============================================================================

COMPATIBILITY_WEIGHTS = {
    'subject_similarity': 0.20,              # 20%
    'topic_similarity': 0.10,                # 10%
    'knowledge_compatibility': 0.15,         # 15%
    'academic_goal_compatibility': 0.15,     # 15%
    'availability_compatibility': 0.15,      # 15%
    'learning_collaboration_compatibility': 0.10,  # 10%
    'study_duration_compatibility': 0.05,    # 5%
    'communication_compatibility': 0.05,     # 5%
    'consistency_accountability_compatibility': 0.05,  # 5%
}

assert abs(sum(COMPATIBILITY_WEIGHTS.values()) - 1.0) < 1e-6, "Weights must sum to 1.0 (100%)"


# ============================================================================
# 2. STRING NORMALIZATION & EQUIVALENT TOPIC DICTIONARY
# ============================================================================

TOPIC_EQUIVALENCE_MAP = {
    'dsa': 'data structures and algorithms',
    'data structures': 'data structures and algorithms',
    'algorithms': 'data structures and algorithms',
    'algo': 'data structures and algorithms',
    'data structure and algorithm': 'data structures and algorithms',
    'dbms': 'database management systems',
    'database': 'database management systems',
    'databases': 'database management systems',
    'sql': 'database management systems',
    'database management system': 'database management systems',
    'os': 'operating systems',
    'operating system': 'operating systems',
    'cn': 'computer networks',
    'network': 'computer networks',
    'networks': 'computer networks',
    'networking': 'computer networks',
    'computer network': 'computer networks',
    'ml': 'machine learning',
    'machine learning algorithms': 'machine learning',
    'ai': 'machine learning',
    'artificial intelligence': 'machine learning',
    'deep learning': 'deep learning',
    'dl': 'deep learning',
    'nlp': 'natural language processing',
    'natural language processing (nlp)': 'natural language processing',
    'web dev': 'web development',
    'web development': 'web development',
    'full stack': 'web development',
    'frontend': 'web development',
    'backend': 'web development',
    'full stack web': 'web development',
    'linear algebra': 'linear algebra',
    'matrices': 'linear algebra',
    'calculus': 'calculus',
    'integration': 'calculus',
    'differentiation': 'calculus',
    'probability': 'probability and statistics',
    'statistics': 'probability and statistics',
    'stats': 'probability and statistics',
    'probability and statistics': 'probability and statistics',
    'discrete math': 'discrete mathematics',
    'discrete mathematics': 'discrete mathematics',
}


def _clean_str(val: str) -> str:
    """Normalizes string by stripping, lowering, and collapsing spaces."""
    if not val:
        return ""
    return re.sub(r'\s+', ' ', str(val).strip().lower())


def _parse_and_normalize_list(val) -> List[str]:
    """Helper to safely parse and normalize lists from JSON or comma-separated strings."""
    if isinstance(val, list):
        items = val
    elif isinstance(val, str):
        items = val.split(',')
    else:
        items = []

    result = []
    for item in items:
        cleaned = _clean_str(item)
        if cleaned:
            result.append(cleaned)
    return result


def _normalize_topic(topic: str) -> str:
    """Resolves abbreviations and synonyms to standard canonical topic names."""
    cleaned = _clean_str(topic)
    return TOPIC_EQUIVALENCE_MAP.get(cleaned, cleaned)


def _jaccard_similarity(set_a: Set[str], set_b: Set[str]) -> float:
    """Returns Jaccard similarity index between 0.0 and 1.0."""
    if not set_a and not set_b:
        return 0.5
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a.intersection(set_b))
    union = len(set_a.union(set_b))
    return (intersection / union) if union > 0 else 0.0


# ============================================================================
# 3. INDIVIDUAL SCORING FUNCTIONS (Each returns normalized 0.0 - 100.0)
# ============================================================================

def score_subject_similarity(target_q: QuestionnaireResponse, cand_q: QuestionnaireResponse) -> Tuple[float, List[str]]:
    """
    Factor 1: Subject Similarity (Weight 20%)
    Set-based comparison of normalized subjects.
    """
    subjects_a = set(_parse_and_normalize_list(target_q.subjects))
    if target_q.custom_subject:
        subjects_a.add(_clean_str(target_q.custom_subject))

    subjects_b = set(_parse_and_normalize_list(cand_q.subjects))
    if cand_q.custom_subject:
        subjects_b.add(_clean_str(cand_q.custom_subject))

    if not subjects_a or not subjects_b:
        return 40.0, []

    intersection = subjects_a.intersection(subjects_b)
    reasons = []

    if intersection:
        # High overlap bonus
        overlap_ratio = len(intersection) / min(len(subjects_a), len(subjects_b))
        jaccard = len(intersection) / len(subjects_a.union(subjects_b))
        score = 60.0 + 40.0 * (0.6 * overlap_ratio + 0.4 * jaccard)
        display_names = [s.title() for s in list(intersection)[:2]]
        reasons.append(f"Shared subject focus: {', '.join(display_names)}")
    else:
        # Check closely related subjects (e.g. CS and Programming/Data Science)
        is_tech_a = any('computer' in s or 'programming' in s or 'data science' in s for s in subjects_a)
        is_tech_b = any('computer' in s or 'programming' in s or 'data science' in s for s in subjects_b)
        if is_tech_a and is_tech_b:
            score = 50.0
            reasons.append("Related technical disciplines")
        else:
            score = 15.0

    return min(100.0, max(0.0, score)), reasons


def score_topic_similarity(target_q: QuestionnaireResponse, cand_q: QuestionnaireResponse, fallback_subject_score: float) -> Tuple[float, List[str]]:
    """
    Factor 2: Topic Similarity (Weight 10%)
    Normalized topic matching with synonym resolution.
    """
    topics_a = {_normalize_topic(t) for t in _parse_and_normalize_list(target_q.topics)}
    if target_q.custom_topics:
        for t in target_q.custom_topics.split(','):
            if t.strip():
                topics_a.add(_normalize_topic(t))

    topics_b = {_normalize_topic(t) for t in _parse_and_normalize_list(cand_q.topics)}
    if cand_q.custom_topics:
        for t in cand_q.custom_topics.split(','):
            if t.strip():
                topics_b.add(_normalize_topic(t))

    reasons = []

    # If neither or only one specified topics, use subject score as representative
    if not topics_a or not topics_b:
        return fallback_subject_score, []

    intersection = topics_a.intersection(topics_b)

    if intersection:
        overlap_ratio = len(intersection) / min(len(topics_a), len(topics_b))
        jaccard = len(intersection) / len(topics_a.union(topics_b))
        score = 55.0 + 45.0 * (0.65 * overlap_ratio + 0.35 * jaccard)
        top_topics = [t.title() for t in list(intersection)[:2]]
        reasons.append(f"Targeting topics: {', '.join(top_topics)}")
    else:
        score = 30.0

    return min(100.0, max(0.0, score)), reasons


def _level_numeric(text: str) -> int:
    """Maps understanding level to 1-5 integer scale."""
    t = _clean_str(text)
    if 'expert' in t:
        return 5
    if 'advanced' in t:
        return 4
    if 'intermediate' in t:
        return 3
    if 'basic' in t:
        return 2
    if 'beginner' in t:
        return 1
    return 3


def score_knowledge_compatibility(target_q: QuestionnaireResponse, cand_q: QuestionnaireResponse) -> Tuple[float, List[str]]:
    """
    Factor 3: Knowledge-Level Compatibility (Weight 15%)
    Bidirectional evaluation of understanding levels and partner preferences.
    Supports complementary preferences (beginner with advanced mentor, peer learning, etc.).
    """
    level_a = _level_numeric(target_q.understanding_level)
    level_b = _level_numeric(cand_q.understanding_level)

    pref_a = _clean_str(target_q.preferred_partner_level)
    pref_b = _clean_str(cand_q.preferred_partner_level)

    def eval_preference(seeker_level: int, seeker_pref: str, peer_level: int) -> float:
        delta = peer_level - seeker_level  # positive if peer is more advanced

        if 'current level' in seeker_pref:
            if delta == 0:
                return 100.0
            if abs(delta) == 1:
                return 75.0
            return 45.0
        elif 'more advanced' in seeker_pref:
            if delta == 1:
                return 100.0  # ideal: slightly more advanced
            if delta >= 2:
                return 90.0   # highly advanced
            if delta == 0:
                return 70.0   # same level
            return 40.0       # less advanced
        elif 'beginner' in seeker_pref or 'teach' in seeker_pref:
            if delta < 0:
                return 100.0  # peer can be taught
            if delta == 0:
                return 80.0   # can teach and learn mutually
            return 65.0
        else:
            # No preference
            return 85.0

    score_a_to_b = eval_preference(level_a, pref_a, level_b)
    score_b_to_a = eval_preference(level_b, pref_b, level_a)

    # Harmonized bidirectional score
    combined = 0.55 * score_a_to_b + 0.45 * score_b_to_a
    reasons = []

    if combined >= 85.0:
        if abs(level_a - level_b) == 0:
            reasons.append("Balanced knowledge level match for peer studying")
        elif level_b > level_a:
            reasons.append("Partner provides strong subject depth and guidance")
        elif level_a > level_b:
            reasons.append("Complementary teach-and-learn collaborative format")
        else:
            reasons.append("Harmonious knowledge proficiency synergy")

    return min(100.0, max(0.0, combined)), reasons


def score_academic_goal_compatibility(target_q: QuestionnaireResponse, cand_q: QuestionnaireResponse) -> Tuple[float, List[str]]:
    """
    Factor 4: Academic Goal Compatibility (Weight 15%)
    Compares primary academic goals with semantic clustering.
    """
    goal_a = _clean_str(target_q.primary_goal)
    goal_b = _clean_str(cand_q.primary_goal)

    reasons = []

    if not goal_a or not goal_b:
        return 70.0, []

    if goal_a == goal_b:
        display = target_q.primary_goal.replace('.', '').strip()
        reasons.append(f"Matching goal: {display}")
        return 100.0, reasons

    # Semantic goal clusters
    clusters = [
        {'placement preparation', 'competitive examination preparation', 'examination preparation'},
        {'project development', 'learning new skills', 'completing assignments'},
        {'improving subject knowledge', 'learning new skills', 'examination preparation'},
    ]

    for cluster in clusters:
        if any(c in goal_a for c in cluster) and any(c in goal_b for c in cluster):
            reasons.append("Closely aligned academic priorities")
            return 82.0, reasons

    return 55.0, reasons


def score_availability_compatibility(target_q: QuestionnaireResponse, cand_q: QuestionnaireResponse) -> Tuple[float, List[str]]:
    """
    Factor 5: Availability Compatibility (Weight 15%)
    Evaluates weekday overlap, preferred study times, and schedule flexibility.
    """
    days_a = set(_parse_and_normalize_list(target_q.available_days))
    days_b = set(_parse_and_normalize_list(cand_q.available_days))

    time_a = _clean_str(target_q.preferred_study_time)
    time_b = _clean_str(cand_q.preferred_study_time)

    flex_a = _clean_str(target_q.schedule_flexibility)
    flex_b = _clean_str(cand_q.schedule_flexibility)

    reasons = []

    # 1. Day overlap score (0 - 100)
    if days_a and days_b:
        day_overlap = len(days_a.intersection(days_b))
        day_score = min(100.0, (day_overlap / max(1, min(len(days_a), len(days_b)))) * 100.0)
    else:
        day_overlap = 0
        day_score = 60.0

    # 2. Time of day score (0 - 100)
    if time_a and time_b:
        if time_a == time_b:
            time_score = 100.0
        elif ('evening' in time_a and 'night' in time_b) or ('night' in time_a and 'evening' in time_b):
            time_score = 80.0
        elif ('morning' in time_a and 'early' in time_b) or ('early' in time_a and 'morning' in time_b):
            time_score = 80.0
        else:
            time_score = 45.0
    else:
        time_score = 70.0

    # 3. Schedule flexibility bonus
    flex_bonus = 0.0
    if 'very flexible' in flex_a or 'very flexible' in flex_b:
        flex_bonus += 12.0
    elif 'somewhat flexible' in flex_a or 'somewhat flexible' in flex_b:
        flex_bonus += 6.0

    combined = (day_score * 0.55 + time_score * 0.45) + flex_bonus

    if days_a.intersection(days_b):
        overlap_sample = [d.title() for d in list(days_a.intersection(days_b))[:3]]
        reasons.append(f"Overlapping schedule: {', '.join(overlap_sample)}")

    return min(100.0, max(0.0, combined)), reasons


def score_learning_collaboration_compatibility(target_q: QuestionnaireResponse, cand_q: QuestionnaireResponse) -> Tuple[float, List[str]]:
    """
    Factor 6: Learning and Collaboration Compatibility (Weight 10%)
    Compares learning preferences, collaboration styles, and partner characteristics.
    """
    modes_a = set(_parse_and_normalize_list(target_q.learning_modes))
    modes_b = set(_parse_and_normalize_list(cand_q.learning_modes))

    collab_a = _clean_str(target_q.collaboration_type)
    collab_b = _clean_str(cand_q.collaboration_type)

    trait_a = _clean_str(target_q.partner_quality)
    trait_b = _clean_str(cand_q.partner_quality)

    reasons = []

    # Learning mode overlap
    learning_sim = _jaccard_similarity(modes_a, modes_b) * 100.0 if (modes_a and modes_b) else 75.0

    # Collaboration style
    if collab_a and collab_b:
        if collab_a == collab_b:
            collab_score = 100.0
            reasons.append("Matching collaboration method")
        elif ('solving' in collab_a and 'discussing' in collab_b) or ('discussing' in collab_a and 'solving' in collab_b):
            collab_score = 85.0
        else:
            collab_score = 65.0
    else:
        collab_score = 75.0

    # Temperament / characteristics
    if trait_a and trait_b:
        if trait_a == trait_b or 'combination' in trait_a or 'combination' in trait_b:
            trait_score = 95.0
        else:
            trait_score = 75.0
    else:
        trait_score = 80.0

    combined = learning_sim * 0.40 + collab_score * 0.35 + trait_score * 0.25
    return min(100.0, max(0.0, combined)), reasons


def score_study_duration_compatibility(target_q: QuestionnaireResponse, cand_q: QuestionnaireResponse) -> Tuple[float, List[str]]:
    """
    Factor 7: Study Duration Compatibility (Weight 5%)
    Compares session length and structure (e.g. Pomodoro focus).
    """
    dur_a = _clean_str(target_q.session_duration)
    dur_b = _clean_str(cand_q.session_duration)

    struct_a = _clean_str(target_q.session_structure)
    struct_b = _clean_str(cand_q.session_structure)

    reasons = []

    # Duration comparison
    def dur_order(text: str) -> int:
        if '15' in text:
            return 1
        if '30' in text:
            return 2
        if '1–2' in text or '1-2' in text:
            return 3
        if '2–3' in text or '2-3' in text:
            return 4
        if 'more than 3' in text:
            return 5
        return 3

    delta_dur = abs(dur_order(dur_a) - dur_order(dur_b))
    dur_score = max(30.0, 100.0 - (delta_dur * 22.0))

    # Structuring comparison
    if struct_a and struct_b:
        if struct_a == struct_b:
            struct_score = 100.0
            if 'pomodoro' in struct_a:
                reasons.append("Both prefer Pomodoro focus sessions (25/5)")
            else:
                reasons.append("Matching study session structure")
        elif 'pomodoro' in struct_a and 'short' in struct_b or 'short' in struct_a and 'pomodoro' in struct_b:
            struct_score = 88.0
        elif 'flexible' in struct_a or 'flexible' in struct_b:
            struct_score = 82.0
        else:
            struct_score = 55.0
    else:
        struct_score = 75.0

    combined = dur_score * 0.55 + struct_score * 0.45
    return min(100.0, max(0.0, combined)), reasons


def score_communication_compatibility(target_q: QuestionnaireResponse, cand_q: QuestionnaireResponse) -> Tuple[float, List[str]]:
    """
    Factor 8: Communication Compatibility (Weight 5%)
    Compares preferred channels (text, voice, video, in-person, notes).
    """
    comms_a = set(_parse_and_normalize_list(target_q.communication_channels))
    comms_b = set(_parse_and_normalize_list(cand_q.communication_channels))

    reasons = []

    if not comms_a or not comms_b:
        return 75.0, []

    intersection = comms_a.intersection(comms_b)
    if intersection:
        overlap_ratio = len(intersection) / min(len(comms_a), len(comms_b))
        score = 60.0 + 40.0 * overlap_ratio
        top_comm = list(intersection)[0].replace('.', '').strip().title()
        reasons.append(f"Shared communication channel: {top_comm}")
    else:
        score = 35.0

    return min(100.0, max(0.0, score)), reasons


def score_consistency_accountability_compatibility(target_q: QuestionnaireResponse, cand_q: QuestionnaireResponse) -> Tuple[float, List[str]]:
    """
    Factor 9: Consistency and Accountability Compatibility (Weight 5%)
    Evaluates consistency, procrastination, and accountability pairing.
    Does not assume students must have identical discipline: pairs accountability seekers with motivators.
    """
    cons_a = _clean_str(target_q.consistency_rating)
    cons_b = _clean_str(cand_q.consistency_rating)

    track_a = _clean_str(target_q.tracking_preference)
    track_b = _clean_str(cand_q.tracking_preference)

    imp_a = _clean_str(target_q.accountability_importance)
    imp_b = _clean_str(cand_q.accountability_importance)

    reasons = []

    # 1. Accountability importance synergy
    def imp_level(text: str) -> int:
        if 'extremely' in text:
            return 5
        if 'very' in text:
            return 4
        if 'moderately' in text:
            return 3
        if 'slightly' in text:
            return 2
        return 1

    diff_imp = abs(imp_level(imp_a) - imp_level(imp_b))
    imp_score = max(40.0, 100.0 - (diff_imp * 18.0))

    # 2. Tracking & Consistency pairing
    # If one wants tracking and the other is very consistent, that is a great accountability match!
    is_seeker_a = 'yes' in track_a
    is_stable_b = 'very consistent' in cons_b or 'mostly consistent' in cons_b

    is_seeker_b = 'yes' in track_b
    is_stable_a = 'very consistent' in cons_a or 'mostly consistent' in cons_a

    if (is_seeker_a and is_stable_b) or (is_seeker_b and is_stable_a):
        pairing_score = 98.0
        reasons.append("High accountability synergy & peer motivation")
    elif 'very consistent' in cons_a and 'very consistent' in cons_b:
        pairing_score = 95.0
        reasons.append("Both share high study consistency")
    else:
        pairing_score = 75.0

    combined = imp_score * 0.45 + pairing_score * 0.55
    return min(100.0, max(0.0, combined)), reasons


# ============================================================================
# 4. GLOBAL STUDENT RETRIEVAL & MASTER COMPATIBILITY CALCULATION
# ============================================================================

def get_global_eligible_candidates(requesting_user: User) -> List[Tuple[User, QuestionnaireResponse]]:
    """
    Retrieves eligible students platform-wide:
    - Global retrieval (not restricted to any StudySpace).
    - StudySpace membership is not mandatory.
    - Excludes requesting_user.
    - Excludes students without completed questionnaires.
    - Avoids duplicate recommendations (uses latest valid response per student).
    - Respects active account status (is_active=True).
    """
    eligible_users = User.objects.filter(is_active=True).exclude(id=requesting_user.id).select_related('profile')

    candidates = []
    for user in eligible_users:
        latest_q = QuestionnaireResponse.objects.filter(user=user).order_by('-created_at').first()
        if latest_q:
            # Valid completed questionnaire verification
            if latest_q.subjects or latest_q.understanding_level:
                candidates.append((user, latest_q))

    return candidates


def calculate_partner_matches(target_q: QuestionnaireResponse, requesting_user: User, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Master global matching function implementing the 9-factor weighted formula:
    Final Score = Sum(Factor Score * Factor Weight)
    Returns Top `limit` matched study partners with calculated score and dynamic reasons.
    """
    candidate_pairs = get_global_eligible_candidates(requesting_user)

    scored_partners = []

    for candidate_user, cand_q in candidate_pairs:
        profile: Optional[StudentProfile] = getattr(candidate_user, 'profile', None)

        all_reasons = []

        # 1. Subject Similarity (20%)
        f1_subject, r1 = score_subject_similarity(target_q, cand_q)
        all_reasons.extend(r1)

        # 2. Topic Similarity (10%)
        f2_topic, r2 = score_topic_similarity(target_q, cand_q, fallback_subject_score=f1_subject)
        all_reasons.extend(r2)

        # 3. Knowledge-Level Compatibility (15%)
        f3_knowledge, r3 = score_knowledge_compatibility(target_q, cand_q)
        all_reasons.extend(r3)

        # 4. Academic Goal Compatibility (15%)
        f4_goal, r4 = score_academic_goal_compatibility(target_q, cand_q)
        all_reasons.extend(r4)

        # 5. Availability Compatibility (15%)
        f5_avail, r5 = score_availability_compatibility(target_q, cand_q)
        all_reasons.extend(r5)

        # 6. Learning & Collaboration Compatibility (10%)
        f6_collab, r6 = score_learning_collaboration_compatibility(target_q, cand_q)
        all_reasons.extend(r6)

        # 7. Study Duration Compatibility (5%)
        f7_duration, r7 = score_study_duration_compatibility(target_q, cand_q)
        all_reasons.extend(r7)

        # 8. Communication Compatibility (5%)
        f8_comm, r8 = score_communication_compatibility(target_q, cand_q)
        all_reasons.extend(r8)

        # 9. Consistency & Accountability Compatibility (5%)
        f9_consist, r9 = score_consistency_accountability_compatibility(target_q, cand_q)
        all_reasons.extend(r9)

        # -------------------------------------------------------------
        # EXACT WEIGHTED FORMULA:
        # Final Score = Sum of (Factor Score × Factor Weight)
        # -------------------------------------------------------------
        weighted_score = (
            f1_subject   * COMPATIBILITY_WEIGHTS['subject_similarity'] +
            f2_topic     * COMPATIBILITY_WEIGHTS['topic_similarity'] +
            f3_knowledge * COMPATIBILITY_WEIGHTS['knowledge_compatibility'] +
            f4_goal      * COMPATIBILITY_WEIGHTS['academic_goal_compatibility'] +
            f5_avail     * COMPATIBILITY_WEIGHTS['availability_compatibility'] +
            f6_collab    * COMPATIBILITY_WEIGHTS['learning_collaboration_compatibility'] +
            f7_duration  * COMPATIBILITY_WEIGHTS['study_duration_compatibility'] +
            f8_comm      * COMPATIBILITY_WEIGHTS['communication_compatibility'] +
            f9_consist   * COMPATIBILITY_WEIGHTS['consistency_accountability_compatibility']
        )

        final_percentage = int(round(weighted_score))
        final_percentage = min(99, max(50, final_percentage))

        # Select top distinct reasons
        unique_reasons = []
        for r in all_reasons:
            if r and r not in unique_reasons:
                unique_reasons.append(r)

        if not unique_reasons:
            unique_reasons.append("Compatible study goals & schedule")

        full_name = f"{candidate_user.first_name} {candidate_user.last_name}".strip() or candidate_user.username

        cand_subjects = _parse_and_normalize_list(cand_q.subjects)
        if cand_q.custom_subject:
            cand_subjects.append(cand_q.custom_subject)

        scored_partners.append({
            'id': candidate_user.id,
            'name': full_name,
            'username': candidate_user.username,
            'avatar': profile.avatar_url if profile else '',
            'branch': profile.branch if profile and profile.branch else 'Engineering & Sciences',
            'year': profile.year if profile and profile.year else 3,
            'bio': profile.bio if profile and profile.bio else 'Passionate student collaborating on StudyBuddy AI.',
            'compatibility': final_percentage,
            'match_reasons': unique_reasons[:3],
            'subjects': [s.title() for s in cand_subjects] if cand_subjects else ['General Studies'],
            'availability': cand_q.preferred_study_time or (profile.availability if profile else 'Flexible'),
            'collaboration_style': cand_q.session_structure or (profile.collaboration_style if profile else 'Pomodoro Focus'),
            'breakdown': {
                'subject_score': round(f1_subject, 1),
                'topic_score': round(f2_topic, 1),
                'knowledge_score': round(f3_knowledge, 1),
                'goal_score': round(f4_goal, 1),
                'availability_score': round(f5_avail, 1),
                'collaboration_score': round(f6_collab, 1),
                'duration_score': round(f7_duration, 1),
                'communication_score': round(f8_comm, 1),
                'accountability_score': round(f9_consist, 1),
            }
        })

    # Sort descending by calculated compatibility score
    scored_partners.sort(key=lambda x: x['compatibility'], reverse=True)

    return scored_partners[:limit]
