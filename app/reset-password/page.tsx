import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/PasswordRecoveryForms';
export default function ResetPasswordPage() { return <Suspense fallback={null}><ResetPasswordForm /></Suspense>; }
