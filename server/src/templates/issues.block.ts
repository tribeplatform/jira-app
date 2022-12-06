import { CallbackId } from 'src/enums/callback.enum'

export const CREATE_ISSUE_MODEAL = `
<Form callbackId="${CallbackId.CreateIssueFormSubmit}">
  <List spacing="md">
    {% if resources != blank %}
      <Select
        name="resourceId"
        label="Site"
        items='{{resources}}'
        callbackId="resource-picker"
      />
    {% endif %}
    {% if projects != blank %}
      <Select
        name="projectId"
        label="Project"
        items='{{projects}}'
        callbackId="project-picker"
      />
    {% endif %}
    {% if issueTypes != blank %}
      <Select
        name="issueType"
        label="Issue Type"
        items='{{issueTypes}}'
        callbackId="issue-type-picker"
      />
    {% endif %}
    {% if post != blank %}
      <Input
        name="summary"
        label="Summary"
        {% if post.title != blank%}value="{{post.title}}"{% endif %}
      />
      <Input
        name="description"
        label="Description (Optional)"
        {% if post.shortContent != blank%}value="{{post.shortContent | strip_html}}"{% endif %}
      />
      <Button type="submit" variant="primary">
        Create Issue
      </Button>
    {% endif %}
  </List>
</Form>
`
