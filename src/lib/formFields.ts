/**
 * The contact form's optional fields — everything except Name and Notes — in
 * the order they appear, reading top to bottom THROUGH Notes (email, company,
 * phone and address above it; birthday, tags and lists below).
 *
 * One list, shared by the form and by its Customise section in Tune this app,
 * so the two cannot drift out of step.
 */
export const FORM_FIELDS = ['email', 'company', 'phone', 'address', 'birthday', 'tags', 'lists'] as const
export type FormField = (typeof FORM_FIELDS)[number]

/** Of those, the ones that render ABOVE the Notes field. */
export const ABOVE_NOTES: readonly FormField[] = ['email', 'company', 'phone', 'address']

export const FIELD_LABELS: Record<FormField, string> = {
  email: 'Email',
  company: 'Company',
  phone: 'Phone',
  address: 'Address',
  birthday: 'Birthday',
  tags: 'Tags',
  // "Add to list" (owner's request, 2026-09-17). Lists used to ride along
  // underneath the tag chips, where nobody looking for them found them.
  lists: 'Lists',
}

export function isFormField(v: unknown): v is FormField {
  return typeof v === 'string' && (FORM_FIELDS as readonly string[]).includes(v)
}
