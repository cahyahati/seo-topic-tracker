import { ArticleStatus, TopicContentType, TopicPriority } from "@prisma/client";

export const STATUS_OPTIONS: Array<{ value: ArticleStatus; label: string }> = [
  { value: ArticleStatus.NOT_ASSIGNED, label: "Belum didelegasikan" },
  { value: ArticleStatus.ASSIGNED, label: "Didelegasikan" },
  { value: ArticleStatus.DRAFT_RECEIVED, label: "Draft diterima" },
  { value: ArticleStatus.COMPLETED, label: "Selesai" },
  { value: ArticleStatus.PUBLISHED, label: "Published" },
  { value: ArticleStatus.CANCELED, label: "Dibatalkan" }
];

export const STATUS_LABELS = Object.fromEntries(
  STATUS_OPTIONS.map((status) => [status.value, status.label])
) as Record<ArticleStatus, string>;

export const PRIORITY_OPTIONS: Array<{ value: TopicPriority; label: string }> = [
  { value: TopicPriority.HIGH, label: "High" },
  { value: TopicPriority.MEDIUM, label: "Medium" },
  { value: TopicPriority.LOW, label: "Low" }
];

export const PRIORITY_LABELS = Object.fromEntries(
  PRIORITY_OPTIONS.map((priority) => [priority.value, priority.label])
) as Record<TopicPriority, string>;

export const CONTENT_TYPE_OPTIONS: Array<{ value: TopicContentType; label: string }> = [
  { value: TopicContentType.INFORMATIONAL, label: "Informational" },
  { value: TopicContentType.TRANSACTIONAL, label: "Transactional" },
  { value: TopicContentType.COMPARISON, label: "Comparison" },
  { value: TopicContentType.LISTICLE, label: "Listicle" }
];

export const CONTENT_TYPE_LABELS = Object.fromEntries(
  CONTENT_TYPE_OPTIONS.map((type) => [type.value, type.label])
) as Record<TopicContentType, string>;
