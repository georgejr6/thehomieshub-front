import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Clapperboard, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (!loading && user?.isAdmin) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, loading]);

  if (loading) return null;

  if (user && !user.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
        <Card className="w-full max-w-sm mx-auto shadow-xl text-center">
          <CardHeader>
            <div className="mx-auto bg-destructive/10 text-destructive p-3 rounded-full w-fit mb-4">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Your account does not have admin privileges.</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button variant="outline" onClick={() => navigate('/')}>Go Home</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
      <Card className="w-full max-w-sm mx-auto shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary text-primary-foreground p-3 rounded-full w-fit mb-4">
            <Clapperboard className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">Admin Portal</CardTitle>
          <CardDescription>Sign in with your admin account to continue.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button className="w-full" onClick={() => setAuthOpen(true)}>
            Sign In
          </Button>
        </CardFooter>
      </Card>

      <AuthModal
        isOpen={authOpen}
        onOpenChange={setAuthOpen}
        initialView="main"
      />
    </div>
  );
};

export default AdminLogin;
