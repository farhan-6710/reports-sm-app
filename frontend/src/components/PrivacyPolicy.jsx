import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Divider,
  Link,
} from '@mui/material';
import { PrivacyTip } from '@mui/icons-material';

const PrivacyPolicy = () => {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <PrivacyTip color="primary" sx={{ fontSize: 40 }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            Privacy Policy
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </Typography>

        <Divider sx={{ mb: 4 }} />

        <Box sx={{ '& > section': { mb: 4 } }}>
          <section>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
              1. Introduction
            </Typography>
            <Typography variant="body1" paragraph>
              Welcome to Social Media Analytics ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our social media analytics platform.
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
              2. Information We Collect
            </Typography>
            <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 1, mt: 2 }}>
              2.1 Information You Provide
            </Typography>
            <Typography variant="body1" paragraph>
              When you connect your social media accounts (Facebook, Instagram) through our OAuth integration, we collect:
            </Typography>
            <Box component="ul" sx={{ pl: 3, mb: 2 }}>
              <li><Typography variant="body1">Your Facebook user ID and name</Typography></li>
              <li><Typography variant="body1">Access tokens for your connected pages and accounts</Typography></li>
              <li><Typography variant="body1">Account names and IDs for your Facebook Pages and Instagram Business accounts</Typography></li>
            </Box>

            <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 1, mt: 2 }}>
              2.2 Data from Social Media Platforms
            </Typography>
            <Typography variant="body1" paragraph>
              With your permission, we access and collect analytics data from your connected accounts, including:
            </Typography>
            <Box component="ul" sx={{ pl: 3, mb: 2 }}>
              <li><Typography variant="body1">Page insights and engagement metrics</Typography></li>
              <li><Typography variant="body1">Post performance data</Typography></li>
              <li><Typography variant="body1">Follower and audience statistics</Typography></li>
              <li><Typography variant="body1">Campaign and ad performance data (if connected)</Typography></li>
            </Box>
          </section>

          <section>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
              3. How We Use Your Information
            </Typography>
            <Typography variant="body1" paragraph>
              We use the information we collect to:
            </Typography>
            <Box component="ul" sx={{ pl: 3, mb: 2 }}>
              <li><Typography variant="body1">Generate analytics reports and insights for your social media accounts</Typography></li>
              <li><Typography variant="body1">Provide you with performance metrics and comparisons</Typography></li>
              <li><Typography variant="body1">Enable you to download reports in PDF and Excel formats</Typography></li>
              <li><Typography variant="body1">Maintain and improve our services</Typography></li>
              <li><Typography variant="body1">Respond to your inquiries and provide customer support</Typography></li>
            </Box>
          </section>

          <section>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
              4. Data Security
            </Typography>
            <Typography variant="body1" paragraph>
              We implement industry-standard security measures to protect your information:
            </Typography>
            <Box component="ul" sx={{ pl: 3, mb: 2 }}>
              <li><Typography variant="body1">All access tokens are encrypted using AES-256-CBC encryption before storage</Typography></li>
              <li><Typography variant="body1">We use secure OAuth 2.0 flows for authentication</Typography></li>
              <li><Typography variant="body1">Access tokens are stored securely in our database and never exposed in API responses</Typography></li>
              <li><Typography variant="body1">We follow best practices for secure data handling and transmission</Typography></li>
            </Box>
          </section>

          <section>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
              5. Data Sharing and Disclosure
            </Typography>
            <Typography variant="body1" paragraph>
              We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
            </Typography>
            <Box component="ul" sx={{ pl: 3, mb: 2 }}>
              <li><Typography variant="body1">With Facebook/Meta APIs to fetch your account data (as authorized by you)</Typography></li>
              <li><Typography variant="body1">When required by law or to comply with legal obligations</Typography></li>
              <li><Typography variant="body1">To protect our rights, privacy, safety, or property</Typography></li>
            </Box>
          </section>

          <section>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
              6. Your Rights and Choices
            </Typography>
            <Typography variant="body1" paragraph>
              You have the right to:
            </Typography>
            <Box component="ul" sx={{ pl: 3, mb: 2 }}>
              <li><Typography variant="body1">Disconnect your social media accounts at any time through the account management interface</Typography></li>
              <li><Typography variant="body1">Delete your account and associated data by contacting us</Typography></li>
              <li><Typography variant="body1">Revoke access tokens through your Facebook App settings</Typography></li>
              <li><Typography variant="body1">Request access to the personal information we hold about you</Typography></li>
            </Box>
          </section>

          <section>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
              7. Third-Party Services
            </Typography>
            <Typography variant="body1" paragraph>
              Our platform integrates with Facebook and Instagram through their official APIs. Your use of these services is also governed by their respective privacy policies:
            </Typography>
            <Box component="ul" sx={{ pl: 3, mb: 2 }}>
              <li>
                <Link href="https://www.facebook.com/privacy/explanation" target="_blank" rel="noopener noreferrer">
                  Facebook Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="https://help.instagram.com/519522125107875" target="_blank" rel="noopener noreferrer">
                  Instagram Privacy Policy
                </Link>
              </li>
            </Box>
          </section>

          <section>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
              8. Data Retention
            </Typography>
            <Typography variant="body1" paragraph>
              We retain your account information and access tokens for as long as your account is active or as needed to provide you services. When you disconnect an account, we remove the associated access tokens. Report data is retained according to your usage and can be deleted at any time.
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
              9. Children's Privacy
            </Typography>
            <Typography variant="body1" paragraph>
              Our services are not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
              10. Changes to This Privacy Policy
            </Typography>
            <Typography variant="body1" paragraph>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
              11. Contact Us
            </Typography>
            <Typography variant="body1" paragraph>
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </Typography>
            <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, mb: 2 }}>
              <Typography variant="body1">
                <strong>Email:</strong> mohank@digicarotene.com
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                <strong>Website:</strong>{' '}
                <Link href="https://digicarotene.com" target="_blank" rel="noopener noreferrer">
                  https://digicarotene.com
                </Link>
              </Typography>
            </Box>
          </section>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Typography variant="body2" color="text.secondary" align="center">
          By using our services, you acknowledge that you have read and understood this Privacy Policy.
        </Typography>
      </Paper>
    </Container>
  );
};

export default PrivacyPolicy;

