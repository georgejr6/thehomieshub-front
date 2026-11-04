import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const { setAccessToken } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');
    // "Continue with YouTube" hands back the page they started from (same-site paths only).
    const ret = params.get('return');
    const safeRet = ret && ret.startsWith('/') && !ret.startsWith('//') && !ret.includes('\\') && !/[\r\n]/.test(ret) && ret.length <= 200 ? ret : null;

    if (error || !token) {
      toast({
        title: 'Sign in failed',
        description: error === 'youtube_no_channel' ? 'No YouTube channel was found on that Google account.' : 'Please try again.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    // Where to land after sign-in (set when they clicked an announcement link).
    // Read + clear synchronously so nothing else races to redirect.
    const dest = localStorage.getItem('post_auth_redirect') || safeRet || '/';
    localStorage.removeItem('post_auth_redirect');
    localStorage.removeItem('post_auth_redirect_ts');

    setAccessToken(token).then(() => navigate(dest));
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground text-sm">Signing you in...</p>
      </div>
    </div>
  );
}
