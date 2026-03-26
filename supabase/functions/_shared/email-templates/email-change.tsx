/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

const LOGO_URL = 'https://qsykyiqplslvmxdfudxq.supabase.co/storage/v1/object/public/email-assets/logo.png'

export const EmailChangeEmail = ({ siteName, email, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <Html lang="el" dir="ltr">
    <Head />
    <Preview>Επιβεβαίωση αλλαγής email στο {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} width="40" height="40" alt={siteName} style={logo} />
        <Heading style={h1}>Αλλαγή διεύθυνσης email</Heading>
        <Text style={text}>
          Ζητήσατε αλλαγή email στο {siteName} από{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link>{' '}
          σε{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <Text style={text}>Πατήστε το παρακάτω κουμπί για να επιβεβαιώσετε την αλλαγή:</Text>
        <Button style={button} href={confirmationUrl}>
          Επιβεβαίωση Αλλαγής
        </Button>
        <Text style={footer}>
          Αν δεν ζητήσατε αυτή την αλλαγή, ασφαλίστε τον λογαριασμό σας άμεσα.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }
const container = { padding: '32px 28px' }
const logo = { marginBottom: '24px' }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#18181b', margin: '0 0 20px', letterSpacing: '-0.02em' }
const text = { fontSize: '14px', color: '#6b6e76', lineHeight: '1.6', margin: '0 0 24px' }
const link = { color: '#007AFF', textDecoration: 'none' }
const button = { backgroundColor: '#007AFF', color: '#ffffff', fontSize: '14px', fontWeight: '500' as const, borderRadius: '10px', padding: '12px 24px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#a1a1aa', margin: '32px 0 0' }
