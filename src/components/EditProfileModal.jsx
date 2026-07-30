import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Upload, Instagram, Twitter, Youtube, Github } from 'lucide-react';
import api from '@/api/homieshub';

const EditProfileModal = ({ isOpen, onOpenChange, userData, onProfileUpdated }) => {
  const { toast } = useToast();
  const { user, setAccessToken, refreshMe } = useAuth();
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);

  const [formData, setFormData] = useState({
    avatar: '',
    displayName: '',
    username: '',
    bio: '',
    website: '',
    socials: {
      twitter: '',
      instagram: '',
      youtube: '',
      github: ''
    }
  });

  useEffect(() => {
    if (userData && isOpen) {
      setFormData({
        avatar: userData.avatar || '',
        displayName: userData.name || '',
        username: userData.username || '',
        bio: userData.bio || '',
        website: userData.website || '',
        socials: {
          twitter: userData.socials?.twitter || '',
          instagram: userData.socials?.instagram || '',
          youtube: userData.socials?.youtube || '',
          github: userData.socials?.github || ''
        }
      });
      setAvatarPreview(userData.avatar || null);
    }
  }, [userData, isOpen]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    if (id.startsWith('social-')) {
      const socialKey = id.replace('social-', '');
      setFormData(prev => ({
        ...prev,
        socials: {
          ...prev.socials,
          [socialKey]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
  };

  const uploadAvatarToSpaces = async (file) => {
  const form = new FormData();
  form.append("file", file);

  const resp = await api.post(`/files/upload?folder=avatars`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return resp?.data?.result?.url || "";
};


const handleAvatarChange = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    toast({ title: "❌ Invalid file", description: "Please select an image.", variant: "destructive" });
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    toast({ title: "❌ File Too Large", description: "Avatar image must be less than 5MB.", variant: "destructive" });
    return;
  }

  setAvatarFile(file);
  setAvatarPreview(URL.createObjectURL(file)); // ✅ preview only
};


  const validateForm = () => {
    if (!formData.displayName.trim()) {
      toast({
        title: '⚠️ Validation Error',
        description: 'Display name is required.',
        variant: 'destructive'
      });
      return false;
    }

    if (!formData.username.trim()) {
      toast({
        title: '⚠️ Validation Error',
        description: 'Username is required.',
        variant: 'destructive'
      });
      return false;
    }

    if (formData.username.length < 3) {
      toast({
        title: '⚠️ Validation Error',
        description: 'Username must be at least 3 characters long.',
        variant: 'destructive'
      });
      return false;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      toast({
        title: '⚠️ Validation Error',
        description: 'Username can only contain letters, numbers, underscores, and hyphens.',
        variant: 'destructive'
      });
      return false;
    }

    if (formData.bio.length > 500) {
      toast({
        title: '⚠️ Validation Error',
        description: 'Bio must be less than 500 characters.',
        variant: 'destructive'
      });
      return false;
    }

    if (formData.website && !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.website)) {
      toast({
        title: '⚠️ Validation Error',
        description: 'Please enter a valid website URL (e.g., example.com).',
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

const handleSave = async () => {
  if (!validateForm()) return;

  setLoading(true);
  try {
    let avatarUrl = formData.avatar; // existing url from backend
if (avatarFile) {
  avatarUrl = await uploadAvatarToSpaces(avatarFile);
}
    const payload = {
      name: formData.displayName,
      username: formData.username,
      bio: formData.bio,
      avatarUrl,
      website: formData.website,
      socials: formData.socials,
    };

    const resp = await api.patch('/profile/me', payload);
    const updatedProfile = resp?.data?.result?.profile;

    if (!updatedProfile) {
      throw new Error('Invalid profile response');
    }

    // Update AuthContext user immediately
    await refreshMe();

    if (onProfileUpdated) {
      onProfileUpdated(updatedProfile);
    }

    toast({
      title: '✅ Profile Updated!',
      description: 'Your profile has been successfully updated.',
    });

    onOpenChange(false);
  } catch (error) {
    toast({
      title: '❌ Update Failed',
      description:
        error?.response?.data?.message ||
        error.message ||
        'Failed to update profile',
      variant: 'destructive',
    });
  } finally {
    setLoading(false);
  }
};


  const handleCancel = () => {
    setFormData({
      avatar: userData?.avatar || '',
      displayName: userData?.name || '',
      username: userData?.username || '',
      bio: userData?.bio || '',
      website: userData?.website || '',
      socials: {
        twitter: userData?.socials?.twitter || '',
        instagram: userData?.socials?.instagram || '',
        youtube: userData?.socials?.youtube || '',
        github: userData?.socials?.github || ''
      }
    });
    setAvatarPreview(userData?.avatar || null);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information. Changes will be visible to other users.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24 border-4 border-primary/20">
              <AvatarImage src={avatarPreview || formData.avatar} alt="Profile avatar" />
              <AvatarFallback className="text-2xl">
                {(formData.displayName || 'U').charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-center gap-2">
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-md transition-colors">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm font-medium">Upload Avatar</span>
                </div>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="sr-only"
                  disabled={loading}
                />
              </Label>
              <p className="text-xs text-muted-foreground">Max size: 5MB</p>
            </div>
          </div>

          {/* Username — shown first; if it's still an auto-generated default,
              this is the primary thing we want them to notice and fix. */}
          <div className="grid gap-2">
            {userData?.usernameIsDefault && (
              <p className="text-xs font-medium text-primary">
                👋 You're on a temporary username — pick your own below!
              </p>
            )}
            <Label htmlFor="username">
              Username <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                id="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="johndoe"
                className="pl-8"
                disabled={loading}
                maxLength={30}
                autoFocus={!!userData?.usernameIsDefault}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Letters, numbers, underscores, and hyphens only. Min 3 characters.
            </p>
          </div>

          {/* Display Name */}
          <div className="grid gap-2">
            <Label htmlFor="displayName">
              Display Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="displayName"
              value={formData.displayName}
              onChange={handleInputChange}
              placeholder="John Doe"
              disabled={loading}
              maxLength={50}
            />
          </div>

          {/* Bio */}
          <div className="grid gap-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="Tell us about yourself..."
              rows={4}
              disabled={loading}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.bio.length}/500
            </p>
          </div>

          {/* Website */}
          <div className="grid gap-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={formData.website}
              onChange={handleInputChange}
              placeholder="example.com"
              disabled={loading}
            />
          </div>

          {/* Social Links */}
          <div className="grid gap-4">
            <h3 className="text-sm font-semibold">Social Links</h3>
            
            <div className="grid gap-2">
              <Label htmlFor="social-twitter" className="flex items-center gap-2">
                <Twitter className="h-4 w-4" />
                Twitter
              </Label>
              <Input
                id="social-twitter"
                value={formData.socials.twitter}
                onChange={handleInputChange}
                placeholder="username"
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="social-instagram" className="flex items-center gap-2">
                <Instagram className="h-4 w-4" />
                Instagram
              </Label>
              <Input
                id="social-instagram"
                value={formData.socials.instagram}
                onChange={handleInputChange}
                placeholder="username"
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="social-youtube" className="flex items-center gap-2">
                <Youtube className="h-4 w-4" />
                YouTube
              </Label>
              <Input
                id="social-youtube"
                value={formData.socials.youtube}
                onChange={handleInputChange}
                placeholder="channel-url"
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="social-github" className="flex items-center gap-2">
                <Github className="h-4 w-4" />
                GitHub
              </Label>
              <Input
                id="social-github"
                value={formData.socials.github}
                onChange={handleInputChange}
                placeholder="username"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileModal;