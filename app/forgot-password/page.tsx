import { Suspense } from 'react';
import { ForgotPasswordForm } from '@/components/PasswordRecoveryForms';
export default function ForgotPasswordPage() { return <Suspense fallback={null}><ForgotPasswordForm /></Suspense>; }
