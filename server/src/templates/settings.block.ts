import { CallbackId } from 'src/enums/callback.enum'

const CREATE_CONTACT_TOGGLE = `
  <Toggle
    name="createContact"
    label="Enabled automatic contact creation"
    helperText="Create new contact if the member's email does not exist in the Salesforce"
  />
`
const submitButton = (title: string = 'Submit', autoDisabled: boolean = true) => `
  <Button type="submit" variant="primary" ${!autoDisabled ? 'autoDisabled="false"' : ''}>
    ${title}
  </Button>
`

export const EMPTY_SETTINGS_BLOCK = `
<Card>
  <Card.Content>
  <List spacing="sm">
    <Alert
      status="warning"
      title="You need to authenticate Atlassian to activate this integration"
    />
    <Button variant="outline">
      <Link href="{{connectUrl}}">
        Connect Atlassian
      </Link>
    </Button>
    </List>
  </Card.Content>
</Card>
`

export const COMPLETED_SETTINGS_BLOCK = `
<Card>
  <Card.Content className="space-y-3">
    <List spacing="md">
      <Alert
        status="success"
        title="Setup completed"
      >
        <List spacing="sm">
          You have successfully connected your community to Atlassian.
          <Link variant="inherit" href="{{settings.url}}">
            View Atlassian
          </Link>
          <Link variant="inherit" href="{{connectUrl}}">
            Reconnect
          </Link>
        </List>
      </Alert>
    </List>
  </Card.Content>
</Card>
`
