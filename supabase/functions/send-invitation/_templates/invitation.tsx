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
  Button,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface InvitationEmailProps {
  companyName: string;
  roleName: string;
  inviterName: string;
  acceptUrl: string;
  expiresAt: string;
}

export const InvitationEmail = ({
  companyName,
  roleName,
  inviterName,
  acceptUrl,
  expiresAt,
}: InvitationEmailProps) => (
  <Html>
    <Head />
    <Preview>Πρόσκληση στο {companyName} μέσω Olseny</Preview>
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

        <Heading style={h1}>Πρόσκληση στο {companyName}</Heading>

        <Text style={text}>
          Ο/Η <strong>{inviterName}</strong> σας προσκαλεί να γίνετε μέλος της ομάδας{' '}
          <strong>{companyName}</strong> στο Olseny με ρόλο <strong>{roleName}</strong>.
        </Text>

        <Section style={buttonSection}>
          <Link href={acceptUrl} style={button}>
            Αποδοχή Πρόσκλησης
          </Link>
        </Section>

        <Text style={text}>
          Αν δεν έχετε λογαριασμό, θα μπορέσετε να δημιουργήσετε έναν κατά την αποδοχή.
        </Text>

        <Hr style={hr} />

        <Text style={footer}>
          Η πρόσκληση λήγει στις {expiresAt}. Αν δεν αναγνωρίζετε αυτήν την πρόσκληση,
          μπορείτε να αγνοήσετε αυτό το email.
        </Text>

        <Text style={footer}>
          <Link href="https://olseny.com" target="_blank" style={{ color: '#898989' }}>
            Olseny
          </Link>{' '}
          — Διαχείριση Εργασιών & Ομάδων
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InvitationEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
}

const container = {
  paddingLeft: '12px',
  paddingRight: '12px',
  margin: '0 auto',
  maxWidth: '480px',
}

const logoSection = {
  marginTop: '32px',
  marginBottom: '24px',
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: 'bold' as const,
  margin: '0 0 16px',
  padding: '0',
}

const text = {
  color: '#444',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '16px 0',
}

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: '600' as const,
  padding: '12px 32px',
  textDecoration: 'none',
}

const hr = {
  borderColor: '#e5e5e5',
  margin: '24px 0',
}

const footer = {
  color: '#898989',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '8px 0',
}
