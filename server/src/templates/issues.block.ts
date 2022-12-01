export const CREATE_ISSUE_MODEAL = `
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
