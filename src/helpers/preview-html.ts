import DOMPurify from 'dompurify'

// Article HTML belongs to generated sites. In the privileged editor preview,
// retain document formatting and images, but strip active content.
export default function previewHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_URI_REGEXP: /^(?:(?:https?|file|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
    FORBID_TAGS: ['style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['style'],
  })
}
