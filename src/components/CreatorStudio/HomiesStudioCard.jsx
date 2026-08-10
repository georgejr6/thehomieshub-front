import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scissors, Clapperboard, Wand2, ExternalLink, Sparkles } from 'lucide-react';

const STUDIO_URL = 'https://studio.thehomies.app';

// Preview + redirect. Shows what Homies Studio does and nudges toward a
// membership; the actual editor + pricing live on studio.thehomies.app.
const HomiesStudioCard = () => {
  const open = () => window.open(STUDIO_URL, '_blank', 'noopener,noreferrer');

  const features = [
    { icon: Scissors, label: 'Clip your videos' },
    { icon: Clapperboard, label: 'Clip livestreams' },
    { icon: Wand2, label: 'AI auto-edit & captions' },
  ];

  return (
    <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
      <div className="absolute top-3 right-3">
        <Badge className="bg-primary text-black gap-1"><Sparkles className="h-3 w-3" /> Pro</Badge>
      </div>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clapperboard className="h-5 w-5 text-primary" /> Homies Studio
        </CardTitle>
        <CardDescription>
          Cut clips from your videos and livestreams, auto-caption, and export ready-to-post content.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <li key={f.label} className="flex items-center gap-2 text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {f.label}
              </li>
            );
          })}
        </ul>
        <Button className="w-full gap-2" onClick={open}>
          Open Homies Studio <ExternalLink className="h-4 w-4" />
        </Button>
        <p className="text-[11px] text-muted-foreground text-center">
          Opens in a new tab. Editing tools are part of a Homies membership.
        </p>
      </CardContent>
    </Card>
  );
};

export default HomiesStudioCard;
