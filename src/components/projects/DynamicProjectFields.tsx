import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Users, Calendar, Target, MessageSquare, Palette, Film } from 'lucide-react';

interface DynamicProjectFieldsProps {
  projectType: string;
  metadata: Record<string, unknown>;
  onChange: (metadata: Record<string, unknown>) => void;
}

const PLATFORMS = ['Facebook', 'Instagram', 'Google Ads', 'LinkedIn', 'TikTok', 'YouTube'];
const BRAND_ELEMENTS = ['Logo', 'Brand Guidelines', 'Visual Identity', 'Typography', 'Color Palette'];
const POSTING_FREQUENCIES = ['daily', '3x/week', '2x/week', 'weekly', 'biweekly'];

export function DynamicProjectFields({ projectType, metadata, onChange }: DynamicProjectFieldsProps) {
  const update = (key: string, value: unknown) => {
    onChange({ ...metadata, [key]: value });
  };

  const toggleArrayItem = (key: string, item: string) => {
    const current = (metadata[key] as string[]) || [];
    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item];
    update(key, updated);
  };

  const type = projectType?.toLowerCase().replace(/[\s_-]/g, '');

  if (type === 'event' || type === 'events') {
    return (
      <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-secondary/20">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Στοιχεία Event
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Τοποθεσία</Label>
            <Input
              placeholder="π.χ. Ζάππειο Μέγαρο"
              value={(metadata.location as string) || ''}
              onChange={(e) => update('location', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Αριθμός Ατόμων</Label>
            <Input
              type="number"
              placeholder="0"
              value={(metadata.attendees as string) || ''}
              onChange={(e) => update('attendees', e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Ημ/νία Event</Label>
          <Input
            type="date"
            value={(metadata.event_date as string) || ''}
            onChange={(e) => update('event_date', e.target.value)}
          />
        </div>
      </div>
    );
  }

  if (type === 'digitalcampaign' || type === 'digital') {
    return (
      <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-secondary/20">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Στοιχεία Digital Campaign
        </h4>
        <div className="space-y-1.5">
          <Label className="text-xs">Target Audience</Label>
          <Input
            placeholder="π.χ. Γυναίκες 25-45, Αθήνα"
            value={(metadata.target_audience as string) || ''}
            onChange={(e) => update('target_audience', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Platforms</Label>
          <div className="flex flex-wrap gap-3">
            {PLATFORMS.map(platform => (
              <label key={platform} className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox
                  checked={((metadata.platforms as string[]) || []).includes(platform)}
                  onCheckedChange={() => toggleArrayItem('platforms', platform)}
                />
                {platform}
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'pr') {
    return (
      <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-secondary/20">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          Στοιχεία PR
        </h4>
        <div className="space-y-1.5">
          <Label className="text-xs">Target Media</Label>
          <Input
            placeholder="π.χ. Καθημερινή, ΣΚΑΪ, in.gr"
            value={(metadata.target_media as string) || ''}
            onChange={(e) => update('target_media', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Key Messages</Label>
          <Textarea
            placeholder="Βασικά μηνύματα επικοινωνίας..."
            rows={2}
            value={(metadata.key_messages as string) || ''}
            onChange={(e) => update('key_messages', e.target.value)}
          />
        </div>
      </div>
    );
  }

  if (type === 'socialmedia' || type === 'social') {
    return (
      <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-secondary/20">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Στοιχεία Social Media
        </h4>
        <div className="space-y-1.5">
          <Label className="text-xs">Platforms</Label>
          <div className="flex flex-wrap gap-3">
            {PLATFORMS.map(platform => (
              <label key={platform} className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox
                  checked={((metadata.platforms as string[]) || []).includes(platform)}
                  onCheckedChange={() => toggleArrayItem('platforms', platform)}
                />
                {platform}
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Συχνότητα Posting</Label>
          <Select
            value={(metadata.posting_frequency as string) || ''}
            onValueChange={(v) => update('posting_frequency', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Επιλέξτε..." />
            </SelectTrigger>
            <SelectContent>
              {POSTING_FREQUENCIES.map(f => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  if (type === 'branding' || type === 'brand') {
    return (
      <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-secondary/20">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          Στοιχεία Branding
        </h4>
        <div className="space-y-1.5">
          <Label className="text-xs">Brand Elements</Label>
          <div className="flex flex-wrap gap-3">
            {BRAND_ELEMENTS.map(el => (
              <label key={el} className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox
                  checked={((metadata.brand_elements as string[]) || []).includes(el)}
                  onCheckedChange={() => toggleArrayItem('brand_elements', el)}
                />
                {el}
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'production' || type === 'video') {
    return (
      <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-secondary/20">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Film className="h-4 w-4 text-primary" />
          Στοιχεία Production
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Format</Label>
            <Input
              placeholder="π.χ. TVC 30'', Social Video"
              value={(metadata.format as string) || ''}
              onChange={(e) => update('format', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Διάρκεια</Label>
            <Input
              placeholder="π.χ. 30 sec, 2 min"
              value={(metadata.duration as string) || ''}
              onChange={(e) => update('duration', e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
}
