import React from "react";
import styles from "./LandingPage.module.css";

interface LandingPageProps {
  onNavigateToAuth: (isSignUp?: boolean) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToAuth }) => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className={styles.landingWrapper}>
      {/* 1. TOP NAVBAR */}
      <header className={styles.navbar}>
        <div className={styles.navContainer}>
          <div className={styles.brandGroup} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className={styles.logoIcon}>SB</div>
            <div className={styles.brandText}>
              <span className={styles.brandTitle}>StudyBuddy</span>
              <span className={styles.brandTagline}>Study smarter together</span>
            </div>
          </div>

          <nav className={styles.navLinks}>
            <a
              href="#about"
              className={styles.navLink}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("about");
              }}
            >
              About
            </a>
            <a
              href="#how-it-works"
              className={styles.navLink}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("how-it-works");
              }}
            >
              How It Works
            </a>
            <a
              href="#stories"
              className={styles.navLink}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("stories");
              }}
            >
              Stories
            </a>
            <a
              href="#contact"
              className={styles.navLink}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("contact");
              }}
            >
              Contact
            </a>
          </nav>

          <div className={styles.navActions}>
            <button
              type="button"
              className={styles.loginBtn}
              onClick={() => onNavigateToAuth(false)}
            >
              Login
            </button>
            <button
              type="button"
              className={styles.primaryCtaBtn}
              onClick={() => onNavigateToAuth(true)}
            >
              Join Free
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className={styles.heroSection}>
        <div className={styles.heroBackgroundGlow} />
        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>
              <span>✨ Your goals. Your people. Your progress.</span>
            </div>

            <h1 className={styles.heroHeading}>
              Find your people. <br />
              <span className={styles.highlightOrange}>Make studying count.</span>
            </h1>

            <p className={styles.heroSubtext}>
              Meet study partners who share your goals, match your schedule, and help you stay consistent.
            </p>

            <div className={styles.heroCtaGroup}>
              <button
                type="button"
                className={styles.heroPrimaryBtn}
                onClick={() => onNavigateToAuth(true)}
              >
                Find your study buddy →
              </button>
              <button
                type="button"
                className={styles.heroSecondaryBtn}
                onClick={() => scrollToSection("how-it-works")}
              >
                Explore how it works
              </button>
            </div>

            {/* Quick Pillars */}
            <div className={styles.heroPills}>
              <div className={styles.pillCard}>
                <strong>🤝 Community</strong>
                <span>• Learn together</span>
              </div>
              <div className={styles.pillCard}>
                <strong>🎯 Better matches</strong>
                <span>• Shared goals</span>
              </div>
              <div className={styles.pillCard}>
                <strong>🔥 Consistency</strong>
                <span>• Stay accountable</span>
              </div>
            </div>
          </div>

          {/* Interactive AI Match Preview Card */}
          <div className={styles.heroVisual}>
            <div className={styles.matchPreviewCard}>
              <div className={styles.matchCardHeader}>
                <div className={styles.matchScoreBadge}>
                  <span className={styles.matchStatusDot} />
                  96% AI Match Compatibility
                </div>
                <span style={{ fontSize: "12px", color: "#888" }}>Active Now</span>
              </div>

              <div className={styles.buddyProfileRow}>
                <div className={styles.buddyAvatar}>PK</div>
                <div className={styles.buddyMeta}>
                  <h4>Priya Sharma</h4>
                  <p>Computer Science • 3rd Year</p>
                </div>
              </div>

              <div className={styles.tagGroup}>
                <span className={styles.tagItem}>📚 Data Structures</span>
                <span className={styles.tagItem}>💻 Full-Stack Dev</span>
                <span className={styles.tagItem}>⏰ Evening 7–10 PM</span>
              </div>

              <div className={styles.aiInsightBox}>
                <strong>AI Match Reason:</strong> Both preparing for upcoming midterms with high focus scores and identical study hour preferences.
              </div>

              <button
                type="button"
                className={styles.connectSampleBtn}
                onClick={() => onNavigateToAuth(true)}
              >
                Connect & Study Together 🚀
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. OUR PURPOSE SECTION */}
      <section id="about" className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionPretitle}>Our Purpose</span>
          <h2 className={styles.sectionTitle}>Studying is better when you don't do it alone.</h2>
          <p className={styles.sectionSubtitle}>
            StudyBuddy helps you connect with students based on what you're learning, what you're working toward, and how you prefer to study.
          </p>
        </div>

        <div className={styles.purposeGrid}>
          <div className={styles.purposeCard}>
            <div className={styles.purposeIcon}>🎯</div>
            <h3>Compatible study partners</h3>
            <p>Go beyond matching by subject alone. Find peers who share your focus level, learning pace, and ambition.</p>
          </div>

          <div className={styles.purposeCard}>
            <div className={styles.purposeIcon}>⏰</div>
            <h3>Shared goals and schedules</h3>
            <p>Find time to learn together without endless back-and-forth messaging. Sync focus slots seamlessly.</p>
          </div>

          <div className={styles.purposeCard}>
            <div className={styles.purposeIcon}>📈</div>
            <h3>Progress and accountability</h3>
            <p>Build consistent study habits together. Keep daily streaks alive and encourage each other through difficult topics.</p>
          </div>
        </div>
      </section>

      {/* 4. PLATFORM METRICS / COMMUNITY GROWTH */}
      <section className={styles.metricsSection}>
        <div className={styles.metricsContainer}>
          <span className={styles.sectionPretitle}>Community Growth</span>
          <h2 className={styles.sectionTitle}>A community that grows together</h2>
          <p className={styles.sectionSubtitle}>
            Every learner starts somewhere. Make your next study session count.
          </p>

          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricNumber}>5,000+</div>
              <div className={styles.metricLabel}>Learners on the platform</div>
              <div className={styles.metricSubtext}>Across universities & colleges</div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricNumber}>12,400+</div>
              <div className={styles.metricLabel}>Study connections made</div>
              <div className={styles.metricSubtext}>AI-recommended pairs</div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricNumber}>94%</div>
              <div className={styles.metricLabel}>Consistency improvement</div>
              <div className={styles.metricSubtext}>Reported by active study buddies</div>
            </div>
          </div>

          <div style={{ fontSize: "13px", color: "#8a94a6" }}>
            * Connect real platform metrics when available.
          </div>
        </div>
      </section>

      {/* 5. HOW STUDYBUDDY WORKS */}
      <section id="how-it-works" className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionPretitle}>Simple 3-Step Process</span>
          <h2 className={styles.sectionTitle}>How StudyBuddy works</h2>
          <p className={styles.sectionSubtitle}>
            Getting matched with a reliable study partner takes less than 2 minutes.
          </p>
        </div>

        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepBadge}>1</div>
            <h3>Create your profile</h3>
            <p>Tell us about your subjects, goals, and preferred study style (Pomodoro, silent accountability, or group discussion).</p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepBadge}>2</div>
            <h3>Discover compatible learners</h3>
            <p>Explore recommendations based on your academic level, exam targets, and daily study schedule.</p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepBadge}>3</div>
            <h3>Study and grow together</h3>
            <p>Coordinate sessions, work toward your goals, keep track of milestones, and build unwavering consistency.</p>
          </div>
        </div>
      </section>

      {/* 6. STUDENT STORIES / TESTIMONIALS */}
      <section id="stories" className={styles.storiesSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionPretitle}>Testimonials</span>
          <h2 className={styles.sectionTitle}>Student stories</h2>
          <p className={styles.sectionSubtitle}>
            Real experiences from learners in the StudyBuddy community.
          </p>
        </div>

        <div className={styles.sectionContainer} style={{ padding: "0 24px" }}>
          <div className={styles.storiesGrid}>
            <div className={styles.storyCard}>
              <div>
                <div className={styles.starsRow}>★★★★★</div>
                <p className={styles.storyQuote}>
                  “Finding a compatible study partner who shared my evening schedule completely shifted my discipline. We completed our Data Structures syllabus 3 weeks before finals!”
                </p>
              </div>
              <div className={styles.storyAuthor}>
                <div className={styles.authorAvatar}>AS</div>
                <div className={styles.authorInfo}>
                  <h5>Aryan Shukla</h5>
                  <span>Computer Engineering • Year 3</span>
                </div>
              </div>
            </div>

            <div className={styles.storyCard}>
              <div>
                <div className={styles.starsRow}>★★★★★</div>
                <p className={styles.storyQuote}>
                  “I used to procrastinate whenever I studied alone in my room. Having a dedicated partner on StudyBuddy kept me honest and on track every single night.”
                </p>
              </div>
              <div className={styles.storyAuthor}>
                <div className={styles.authorAvatar}>AV</div>
                <div className={styles.authorInfo}>
                  <h5>Ayush Vishwakarma</h5>
                  <span>Information Technology • Year 3</span>
                </div>
              </div>
            </div>

            <div className={styles.storyCard}>
              <div>
                <div className={styles.starsRow}>★★★★★</div>
                <p className={styles.storyQuote}>
                  “Add a real student's experience here about finding a compatible study partner and becoming more consistent.”
                </p>
              </div>
              <div className={styles.storyAuthor}>
                <div className={styles.authorAvatar}>SB</div>
                <div className={styles.authorInfo}>
                  <h5>Student Story</h5>
                  <span>Example placeholder — replace with approved testimonial</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. BOTTOM CTA BANNER */}
      <section className={styles.ctaBannerSection}>
        <div className={styles.ctaBannerContainer}>
          <h2>Your next study partner is out there.</h2>
          <p>Start building better study habits, one connection at a time.</p>
          <button
            type="button"
            className={styles.bannerActionBtn}
            onClick={() => onNavigateToAuth(true)}
          >
            Join StudyBuddy →
          </button>
        </div>
      </section>

      {/* 8. CONTACT SECTION */}
      <section id="contact" className={styles.contactSection}>
        <div className={styles.contactGrid}>
          <div className={styles.contactInfo}>
            <span className={styles.sectionPretitle}>Get In Touch</span>
            <h3>We'd love to hear from you</h3>
            <p>
              Have suggestions, questions, or want to bring StudyBuddy to your campus or university? Reach out anytime!
            </p>

            <div className={styles.contactDetailItem}>
              <strong>Email:</strong> your-official-email@example.com
            </div>
            <div className={styles.contactDetailItem}>
              <strong>Community:</strong> dbos.in
            </div>
            <div className={styles.contactDetailItem}>
              <strong>Support:</strong> Available for student feedback & bug reports
            </div>
          </div>

          <div className={styles.quickMessageCard}>
            <h4>Ready to get started?</h4>
            <p>Join thousands of students boosting their productivity and exam confidence.</p>
            <button
              type="button"
              className={styles.quickMessageBtn}
              onClick={() => onNavigateToAuth(true)}
            >
              Create Your Account Now
            </button>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerLeft}>
            <h4>StudyBuddy</h4>
            <p>Better together. One session at a time.</p>
          </div>

          <div className={styles.footerLinks}>
            <a
              href="#about"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("about");
              }}
            >
              About
            </a>
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("contact");
              }}
            >
              Contact
            </a>
            <a href="#privacy" onClick={(e) => e.preventDefault()}>
              Privacy
            </a>
            <a href="#terms" onClick={(e) => e.preventDefault()}>
              Terms
            </a>
          </div>
        </div>

        <div className={styles.footerBottom}>
          © 2026 StudyBuddy AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

