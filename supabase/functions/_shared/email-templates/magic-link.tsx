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
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

const LOGO_URL = 'https://qsykyiqplslvmxdfudxq.supabase.co/storage/v1/object/public/email-assets/logo.png'

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="el" dir="ltr">
    <Head />
    <Preview>Σύνδεσμος σύνδεσης για {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} width="40" height="40" alt={siteName} style={logo} />
        <Heading style={h1}>Σύνδεσμος σύνδεσης</Heading>
        <Text style={text}>
          Πατήστε το παρακάτω κουμπί για να συνδεθείτε στο {siteName}. Ο σύνδεσμος λήγει σύντομα.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Σύνδεση
        </Button>
        <Text style={footer}>
          Αν δεν ζητήσατε αυτόν τον σύνδεσμο, μπορείτε να αγνοήσετε αυτό το email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }
const container = { padding: '32px 28px' }
const logo = { marginBottom: '24px' }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#18181b', margin: '0 0 20px', letterSpacing: '-0.02em' }
const text = { fontSize: '14px', color: '#6b6e76', lineHeight: '1.6', margin: '0 0 24px' }
const button = { backgroundColor: '#007AFF', color: '#ffffff', fontSize: '14px', fontWeight: '500' as const, borderRadius: '10px', padding: '12px 24px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#a1a1aa', margin: '32px 0 0' }
