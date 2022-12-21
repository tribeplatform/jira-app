import { CallbackId } from 'src/enums/callback.enum'

export const CREATE_ISSUE_MODEAL = `
{% capture defaultValues %}
{
  {% if resourceId != blank%}"resourceId":"{{resourceId}}",{% endif %}
  {% if projectId != blank%}"projectId":"{{projectId}}",{% endif %}
  {% if issueType != blank%}"issueType":"{{issueType}}"{% endif %}
}
{% endcapture %}
<Form callbackId="${CallbackId.CreateIssueFormSubmit}" defaultValues='{{defaultValues}}'>
  <List spacing="md">
    {% if resources != blank %}
      <Select
        name="resourceId"
        label="Site"
        items='{{resources}}'
        callbackId="resource-picker"
        {% if resourceId != blank%}value="{{resourceId}}"{% endif %}
      />
    {% endif %}
    {% if projects != blank %}
      <Select
        name="projectId"
        label="Project"
        items='{{projects}}'
        callbackId="project-picker"
        {% if projectId != blank%}value="{{projectId}}"{% endif %}
      />
    {% endif %}
    {% if issueTypes != blank %}
      <Select
        name="issueType"
        label="Issue Type"
        items='{{issueTypes}}'
        callbackId="issue-type-picker"
        {% if issueType != blank%}value="{{issueType}}"{% endif %}
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

export const ISSUE_CREATED_MODAL = `
<Container spacing="sm">
  <Text value="You successfully created {{issue.key}}."></Text>
  <Link href="{{issue.url}}" external>
    View Issue
  </Link>
</Container>
`
export const ISSUE_INFO_BLOCK = `
<Card>
  <Card.Header size="sm" title="Related Jira issues"></Card.Header>
  <Card.Content className="space-y-3">
    <Container spacing="sm">
      <Text value="These are issues created from this post."></Text>
      {% if issues.length %}
        {% for issue in issues %}
            <Link href="{{issue.url}}" external>
            {{issue.key}} {{issue.summary}}
            </Link>
        {% endfor %}
      {% else %}
        <Text value="No issues found"></Text>
      {% endif %}
    </Container>
  </Card.Content>
</Card>
`
