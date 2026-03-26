/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

const LOGO_URL = 'https://qsykyiqplslvmxdfudxq.supabase.co/storage/v1/object/public/email-assets/logo.png'

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="el" dir="ltr">
    <Head />
    <Preview>Κωδικός επαλήθευσης</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} width="40" height="40" alt="Olseny" style={logo} />
        <Heading style={h1}>Επαλήθευση ταυτότητας</Heading>
        <Text style={text}>Χρησιμοποιήστε τον παρακάτω κωδικό για να επιβεβαιώσετε την ταυτότητά σας:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Ο κωδικός λήγει σύντομα. Αν δεν ζητήσατε αυτόν τον κωδικό, μπορείτε να αγνοήσετε αυτό το email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }
const container = { padding: '32px 28px' }
const logo = { marginBottom: '24px' }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#18181b', margin: '0 0 20px', letterSpacing: '-0.02em' }
const text = { fontSize: '14px', color: '#6b6e76', lineHeight: '1.6', margin: '0 0 24px' }
const codeStyle = { fontFamily: "'SF Mono', 'Fira Code', Courier, monospace", fontSize: '28px', fontWeight: '700' as const, color: '#007AFF', letterSpacing: '0.15em', margin: '0 0 32px' }
const footer = { fontSize: '12px', color: '#a1a1aa', margin: '32px 0 0' }
