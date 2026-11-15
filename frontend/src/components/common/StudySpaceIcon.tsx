import type { HTMLAttributes } from "react";

type IconProps = HTMLAttributes<HTMLSpanElement>;
const icon = (symbol: string) => ({ className = "", ...props }: IconProps) => (
  <span aria-hidden="true" className={`inline-grid shrink-0 place-items-center font-bold leading-none ${className}`} {...props}>{symbol}</span>
);

export const ArrowLeft = icon("←");
export const BookOpen = icon("▤");
export const CalendarDays = icon("▦");
export const Check = icon("✓");
export const CheckCircle2 = icon("✓");
export const Flame = icon("♨");
export const HandCoins = icon("♧");
export const MessageCircle = icon("◌");
export const Plus = icon("+");
export const Target = icon("◎");
export const Video = icon("▣");
export const Camera = icon("▣");
export const CameraOff = icon("⊠");
export const LoaderCircle = icon("◌");
export const Mic = icon("♩");
export const MicOff = icon("♫");
export const Phone = icon("☎");
export const PhoneOff = icon("✕");
