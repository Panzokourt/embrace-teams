import { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, UserPlus } from 'lucide-react';
import type { OrgPosition } from './types';

interface OrgDepartmentViewProps {
  positions: OrgPosition[];
  onNodeClick: (node: OrgPosition) => void;
}

const getInitials = (name: string | null | undefined, email?: string) => {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return email?.slice(0, 2).toUpperCase() || '?';
};

export function OrgDepartmentView({ positions, onNodeClick }: OrgDepartmentViewProps) {
  const departments = useMemo(() => {
    const map = new Map<string, OrgPosition[]>();
    for (const p of positions) {
      const dept = p.department || 'Χωρίς τμήμα';
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept)!.push(p);
    }
    // Sort departments by number of members
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [positions]);

  return (
    <div className="p-8 grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      {departments.map(([deptName, members]) => {
        const filled = members.filter(m => m.user_id).length;
        const vacant = members.length - filled;
        const color = members[0]?.color || '#3B82F6';

        return (
          <Card key={deptName} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
                    <Building2 className="h-4 w-4" style={{ color }} />
                  </div>
                  {deptName}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    {filled}
                  </Badge>
                  {vacant > 0 && (
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/30">
                      {vacant} κενές
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {members.sort((a, b) => a.level - b.level).map(member => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onNodeClick(member)}
                >
                  {member.user ? (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.user.avatar_url || undefined} />
                      <AvatarFallback className="text-xs" style={{ backgroundColor: member.color + '18', color: member.color }}>
                        {getInitials(member.user.full_name, member.user.email)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-8 w-8 rounded-full border-2 border-dashed flex items-center justify-center" style={{ borderColor: member.color + '50' }}>
                      <UserPlus className="h-3.5 w-3.5" style={{ color: member.color + '70' }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${!member.user ? 'text-muted-foreground italic' : ''}`}>
                      {member.user?.full_name || 'Κενή θέση'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{member.position_title}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0" style={{ borderColor: member.color + '40', color: member.color }}>
                    L{member.level}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
