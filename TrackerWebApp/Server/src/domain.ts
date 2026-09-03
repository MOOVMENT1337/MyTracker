import { z } from 'zod';

export const statuses = ['Open', 'In Progress', 'Need Info', 'Done', 'Closed'] as const;
export const priorities = ['High', 'Medium', 'Low'] as const;
export const issueTypes = ['Task', 'Bug', 'Story', 'Epic'] as const;
export const transitions = {
  Open: ['In Progress', 'Need Info'],
  'In Progress': ['Done', 'Need Info'],
  'Need Info': ['Open', 'In Progress'],
  Done: ['Closed', 'Open'],
  Closed: ['Open'],
};
export const roleAliases: Record<string, string> = {
  'Сотрудник': 'Employee', 'Администратор': 'Administrator', 'Аналитик': 'Analyst',
  'Тестировщик': 'Tester', 'Frontend-разработчик': 'Frontend Developer',
  'Backend-разработчик': 'Backend Developer', 'Fullstack-разработчик': 'Fullstack Developer',
  'DevOps-инженер': 'DevOps Engineer', 'Дизайнер': 'Designer', 'Системный администратор': 'System Administrator',
};
export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts.length === 1 ? parts[0]!.slice(0, 2) : parts[0]![0]! + parts.at(-1)![0]!).toUpperCase();
}
export const idSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
const name = z.string().trim().min(1).max(120);
const email = z.string().trim().toLowerCase().max(254).pipe(z.email());
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const password = z.string().min(8).max(128);
export const registerSchema = z.strictObject({ displayName: name, email, password });
export const loginSchema = z.strictObject({ identifier: z.string().trim().min(1).max(254), password: z.string().min(1).max(128) });
export const queueSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  key: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9_]{1,19}$/),
  color: color.default('#4F8EF7'),
});
export const issueSchema = z.strictObject({
  queueId: idSchema,
  summary: z.string().trim().min(1).max(500),
  description: z.string().max(50000).default(''),
  status: z.enum(statuses).default('Open'),
  priority: z.enum(priorities).default('Medium'),
  type: z.enum(issueTypes).default('Task'),
  assigneeId: idSchema.nullable().default(null),
});
// Do not inherit create defaults: a PATCH must leave omitted fields unchanged.
export const issuePatchSchema = z.strictObject({
  summary: issueSchema.shape.summary.optional(),
  description: issueSchema.shape.description.unwrap().optional(),
  status: issueSchema.shape.status.unwrap().optional(),
  priority: issueSchema.shape.priority.unwrap().optional(),
  type: issueSchema.shape.type.unwrap().optional(),
  assigneeId: issueSchema.shape.assigneeId.unwrap().optional(),
})
  .extend({ version: z.number().int().positive().optional() })
  .refine(v => Object.keys(v).some(k => k !== 'version'), 'At least one changed field required');
export const userPatchSchema = z.strictObject({ displayName: name.optional(), role: name.optional() })
  .refine(v => Object.keys(v).length > 0, 'At least one changed field required');
export const settingsSchema = z.strictObject({
  theme: z.enum(['light', 'dark']).optional(), language: z.enum(['en', 'ru']).optional(),
}).refine(v => Object.keys(v).length > 0, 'At least one setting required');
export const commentSchema = z.strictObject({ text: z.string().trim().min(1).max(10000) });
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(1000000).default(0),
});
const multi = <T extends readonly [string, ...string[]]>(values: T) =>
  z.union([z.enum(values), z.array(z.enum(values)).min(1).max(values.length)]).optional();
export const filterSchema = paginationSchema.extend({
  queueId: idSchema.optional(), status: multi(statuses), priority: multi(priorities),
  type: multi(issueTypes), assigneeId: idSchema.optional(),
  search: z.string().trim().max(200).optional(),
  myTasks: z.enum(['true', 'false']).default('false'),
}).strict();
export type IssueInput = z.infer<typeof issueSchema>;
export type IssuePatch = z.infer<typeof issuePatchSchema>;
export type Filters = z.infer<typeof filterSchema>;
export type PublicUser = {
  id: string; email: string; displayName: string; initials: string; avatar: string;
  avatarColor: string; role: string; isAdmin: boolean; provider: string;
};
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function required<T>(value: T | undefined | null, name: string): T {
  if (value == null) throw new ApiError(404, 'NOT_FOUND', `${name} not found`);
  return value;
}
