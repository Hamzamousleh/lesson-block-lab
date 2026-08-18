/**
 * Presentation-only: consistent Lucide icon family for block types, used by the
 * Didaktiva V2 visual variant instead of the classic emoji glyphs.
 */
import {
  BarChart3,
  BookOpen,
  Compass,
  GaugeCircle,
  ListOrdered,
  MessageSquare,
  PencilLine,
  Presentation,
  Puzzle,
  Scale,
  Search,
  Ticket,
  TestTube,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  teacher_content: Presentation,
  narrative: BookOpen,
  case: Puzzle,
  theory_test: TestTube,
  compare: Scale,
  find_the_error: Search,
  discussion: MessageSquare,
  dilemma: Zap,
  position: Compass,
  poll: BarChart3,
  ranking: ListOrdered,
  scale: GaugeCircle,
  short_response: PencilLine,
  exit_ticket: Ticket,
};

export function blockIcon(type: string): LucideIcon {
  return ICONS[type] ?? Presentation;
}
