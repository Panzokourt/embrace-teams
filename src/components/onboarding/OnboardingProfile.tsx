import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, ChevronLeft, ChevronRight, Upload, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  userId: string;
  invitationCompanyName?: string;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  phone: string;
  setPhone: (v: string) => void;
  jobTitle: string;
  setJobTitle: (v: string) => void;
}

export default function OnboardingProfile({
  userId, invitationCompanyName, onNext, onBack, onSkip,
  phone, setPhone, jobTitle, setJobTitle,
}: Props) {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAISuggestJobTitle = async () => {
    setAiLoading(true);
    try {
      // Reuse ai-fill-form: ask for a job title suggestion based on email/company
      const { data, error } = await supabase.functions.invoke('ai-fill-form', {
        body: {
          entity: 'profile_job_title',
          context: { user_id: userId, hint: 'Suggest a likely job title for the user based on their email/company' },
          fields: [{ name: 'job_title', label: 'Job Title', type: 'text' }],
        },
      });
      if (error) throw error;
      const value = data?.suggestions?.[0]?.value || data?.fields?.job_title;
      if (value) {
        setJobTitle(String(value));
        toast.success('AI πρόταση εφαρμόστηκε');
      } else {
        toast.info('Δεν βρέθηκε πρόταση — γράψε χειροκίνητα.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Πρόβλημα AI suggestion');
    } finally {
      setAiLoading(false);
    }
  };

  const handleNext = async () => {
    // Upload avatar if selected
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop();
      const path = `avatars/${userId}.${ext}`;
      const { error } = await supabase.storage
        .from('project-files')
        .upload(path, avatarFile, { upsert: true });
      if (!error) {
        const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(path);
        await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', userId);
      }
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <User className="h-10 w-10 text-primary mx-auto mb-2" />
        <h2 className="text-xl font-semibold text-foreground">Το προφίλ σας</h2>
        <p className="text-sm text-muted-foreground">Προαιρετικά στοιχεία</p>
        {invitationCompanyName && (
          <p className="text-xs text-primary mt-1">Εταιρεία: {invitationCompanyName}</p>
        )}
      </div>

      {/* Avatar */}
      <div className="flex justify-center">
        <label className="cursor-pointer group">
          <div className="h-20 w-20 rounded-full border-2 border-dashed border-border/60 group-hover:border-primary/40 flex items-center justify-center overflow-hidden transition-colors">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-1">Φωτογραφία</p>
          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
        </label>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Τηλέφωνο</Label>
          <Input placeholder="+30 210 1234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Θέση εργασίας</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAISuggestJobTitle}
              disabled={aiLoading}
              className="h-7 px-2 text-xs gap-1.5"
            >
              {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-primary" />}
              AI πρόταση
            </Button>
          </div>
          <Input placeholder="π.χ. Project Manager" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-3">
        {!invitationCompanyName && (
          <Button variant="outline" onClick={onBack} className="flex-1">
            <ChevronLeft className="h-4 w-4 mr-1" /> Πίσω
          </Button>
        )}
        <Button onClick={handleNext} className="flex-1">
          Συνέχεια <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
        <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
          Παράλειψη
        </Button>
      </div>
    </div>
  );
}
