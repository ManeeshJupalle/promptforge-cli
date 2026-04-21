Extract structured data from the following resume. Return strictly valid
JSON matching the shape below — no commentary, no trailing prose.

Resume:
{{resume}}

Return JSON of this shape:
{
  "name": string,
  "email": string | null,
  "years_of_experience": number,
  "skills": string[],
  "most_recent_title": string | null
}
