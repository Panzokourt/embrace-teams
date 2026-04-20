import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface PortalInvitationEmailProps {
  companyName: string
  clientName: string
  inviterName: string
  acceptUrl: string
  pin?: string
}

export const PortalInvitationEmail = ({
  companyName,
  clientName,
  inviterName,
  acceptUrl,
  pin,
}: PortalInvitationEmailProps) => (
  <Html>
    <Head />
    <Preview>Πρόσβαση στο Client Portal — {clientName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img
            src="https://qsykyiqplslvmxdfudxq.supabase.co/storage/v1/object/public/email-assets/olseny-logo.png?v=1"
            alt="Olseny"
            width="48"
            height="48"
            style={{ borderRadius: '12px' }}
          />
        </Section>

        <Heading style={h1}>Καλωσήρθατε στο Client Portal</Heading>

        <Text style={text}>
          Ο/Η <strong>{inviterName}</strong> από την <strong>{companyName}</strong> σας
          προσκαλεί να αποκτήσετε πρόσβαση στο Client Portal για τον λογαριασμό{' '}
          <strong>{clientName}</strong>.
        </Text>

        <Text style={text}>
          Από το portal μπορείτε να παρακολουθείτε την πρόοδο των έργων σας, να βλέπετε
          τιμολόγια και να έχετε πρόσβαση στα κοινόχρηστα αρχεία — χωρίς να χρειάζεται να
          φτιάξετε λογαριασμό.
        </Text>

        <Section style={buttonSection}>
          <Link href={acceptUrl} style={button}>
            Είσοδος στο Portal
          </Link>
        </Section>

        <Text style={smallText}>
          Πατώντας το παραπάνω κουμπί, θα συνδεθείτε αυτόματα στο portal σας.
        </Text>

        <Hr style={hr} />

        <Text style={footer}>
          Αν δεν αναγνωρίζετε αυτήν την πρόσκληση, μπορείτε να αγνοήσετε αυτό το email.
        </Text>

        <Text style={footer}>
          <Link href="https://olseny.com" target="_blank" style={{ color: '#898989' }}>
            Olseny
          </Link>{' '}
          — Client Portal
        </Text>
      </Container>
    </Body>
  </Html>
)

const main: React.CSSProperties = {
  backgroundColor: '#f6f6f6',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}

const container: React.CSSProperties = {
  margin: '0 auto',
  padding: '32px 24px',
  maxWidth: '560px',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
}

const logoSection: React.CSSProperties = { marginBottom: '24px' }

const h1: React.CSSProperties = {
  color: '#111',
  fontSize: '22px',
  fontWeight: 600,
  margin: '0 0 16px',
}

const text: React.CSSProperties = {
  color: '#333',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 16px',
}

const smallText: React.CSSProperties = {
  color: '#666',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0 0 12px',
}

const buttonSection: React.CSSProperties = { margin: '24px 0' }

const button: React.CSSProperties = {
  backgroundColor: '#22c55e',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: 600,
  display: 'inline-block',
}

const hr: React.CSSProperties = {
  borderColor: '#eee',
  margin: '24px 0',
}

const footer: React.CSSProperties = {
  color: '#898989',
  fontSize: '12px',
  margin: '0 0 8px',
}
