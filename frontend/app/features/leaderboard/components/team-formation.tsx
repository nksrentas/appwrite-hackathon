import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  Search,
  UserPlus,
  UserMinus,
  Crown,
  Shield,
  Mail,
  MessageSquare,
  Calendar,
  Target,
  Trophy,
  Settings,
  MoreHorizontal,
  Edit,
  Trash2,
  Lock,
  Globe,
  Eye,
  EyeOff,
  Star,
  Award,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Avatar } from '@shared/components/ui/avatar';
import { Input } from '@shared/components/ui/input';
import { Textarea } from '@shared/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { Switch } from '@shared/components/ui/switch';
import { Form, FormField, FormLabel, FormControl } from '@shared/components/ui/form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@shared/components/ui/dropdown-menu';
import { Progress } from '@shared/components/ui/progress';
import { toast } from '@shared/hooks/use-toast';
import { cn } from '@shared/utils/cn';

export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';
export type TeamVisibility = 'public' | 'private' | 'invite-only';
export type TeamSize = 'small' | 'medium' | 'large';

export interface TeamMember {
  id: string;
  userId: string;
  username: string;
  name: string;
  avatar?: string;
  role: TeamRole;
  joinedAt: Date;
  carbonScore: number;
  contributions: number;
  achievements: number;
  lastActive: string;
  skills?: string[];
  availability?: 'active' | 'away' | 'busy';
}

export interface Team {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  visibility: TeamVisibility;
  size: TeamSize;
  maxMembers: number;
  members: TeamMember[];
  createdAt: Date;
  tags: string[];
  carbonGoal?: number;
  currentScore: number;
  activeChallenges: number;
  achievements: number;
  rules?: string[];
  inviteCode?: string;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  teamName: string;
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  message?: string;
}

interface TeamFormationProps {
  className?: string;
  currentUser?: {
    id: string;
    username: string;
    name: string;
    avatar?: string;
  };
  userTeams?: Team[];
  availableTeams?: Team[];
  invites?: TeamInvite[];
  onCreateTeam?: (team: Partial<Team>) => void;
  onJoinTeam?: (teamId: string) => void;
  onLeaveTeam?: (teamId: string) => void;
  onInviteUser?: (teamId: string, username: string) => void;
  onAcceptInvite?: (inviteId: string) => void;
  onDeclineInvite?: (inviteId: string) => void;
}

export const TeamFormation = ({
  className,
  currentUser,
  userTeams = [],
  availableTeams = [],
  invites = [],
  onCreateTeam,
  onJoinTeam,
  onLeaveTeam,
  onInviteUser,
  onAcceptInvite,
  onDeclineInvite,
}: TeamFormationProps) => {
  const [activeTab, setActiveTab] = useState<'my-teams' | 'discover' | 'invites' | 'create'>('my-teams');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [newTeam, setNewTeam] = useState<Partial<Team>>({
    name: '',
    description: '',
    visibility: 'public',
    size: 'small',
    maxMembers: 5,
    tags: [],
    rules: [],
  });

  const [inviteUsername, setInviteUsername] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [teamToInvite, setTeamToInvite] = useState<string | null>(null);

  const mockTeams: Team[] = [
    {
      id: '1',
      name: 'EcoWarriors',
      description: 'Dedicated to making development carbon-neutral through best practices and optimization.',
      visibility: 'public',
      size: 'medium',
      maxMembers: 10,
      members: [
        {
          id: '1',
          userId: 'user1',
          username: 'alice-dev',
          name: 'Alice Johnson',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b832c96a?w=64&h=64&fit=crop&crop=face',
          role: 'owner',
          joinedAt: new Date('2024-01-15'),
          carbonScore: 0.18,
          contributions: 456,
          achievements: 12,
          lastActive: '2 hours ago',
          skills: ['React', 'Node.js', 'Optimization'],
          availability: 'active',
        },
      ],
      createdAt: new Date('2024-01-15'),
      tags: ['optimization', 'green-coding', 'react'],
      carbonGoal: 0.15,
      currentScore: 0.22,
      activeChallenges: 3,
      achievements: 8,
      inviteCode: 'ECO2024',
    },
  ];

  const filteredAvailableTeams = availableTeams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateTeam = () => {
    if (!newTeam.name || !newTeam.description) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a team name and description.',
      });
      return;
    }

    onCreateTeam?.(newTeam);
    setNewTeam({
      name: '',
      description: '',
      visibility: 'public',
      size: 'small',
      maxMembers: 5,
      tags: [],
      rules: [],
    });
    setShowCreateDialog(false);
    
    toast({
      title: 'Team Created',
      description: `${newTeam.name} has been created successfully!`,
    });
  };

  const handleInviteUser = () => {
    if (!inviteUsername || !teamToInvite) return;

    onInviteUser?.(teamToInvite, inviteUsername);
    setInviteUsername('');
    setShowInviteDialog(false);
    setTeamToInvite(null);
    
    toast({
      title: 'Invitation Sent',
      description: `Invitation sent to @${inviteUsername}`,
    });
  };

  const getRoleIcon = (role: TeamRole) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getRoleBadgeVariant = (role: TeamRole) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getVisibilityIcon = (visibility: TeamVisibility) => {
    switch (visibility) {
      case 'public':
        return <Globe className="h-4 w-4" />;
      case 'private':
        return <Lock className="h-4 w-4" />;
      case 'invite-only':
        return <Mail className="h-4 w-4" />;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        duration: 0.6,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-lg text-carbon-900 font-bold mb-2">
            Team Formation
          </h1>
          <p className="text-body-md text-carbon-600">
            Join teams, collaborate on challenges, and achieve carbon goals together
          </p>
        </div>

        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="my-teams">
            My Teams ({userTeams.length})
          </TabsTrigger>
          <TabsTrigger value="discover">
            Discover Teams
          </TabsTrigger>
          <TabsTrigger value="invites">
            Invites ({invites.length})
          </TabsTrigger>
          <TabsTrigger value="create">
            Quick Create
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-teams" className="space-y-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid md:grid-cols-2 gap-6"
          >
            {userTeams.length === 0 ? (
              <motion.div variants={itemVariants} className="md:col-span-2">
                <Card className="text-center py-12">
                  <CardContent>
                    <Users className="h-12 w-12 text-carbon-400 mx-auto mb-4" />
                    <h3 className="text-h5 font-medium mb-2">No teams yet</h3>
                    <p className="text-carbon-600 mb-6">
                      Join or create a team to collaborate on carbon reduction challenges
                    </p>
                    <div className="flex justify-center space-x-3">
                      <Button onClick={() => setActiveTab('discover')}>
                        <Search className="h-4 w-4 mr-2" />
                        Discover Teams
                      </Button>
                      <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Team
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              userTeams.map((team) => (
                <motion.div key={team.id} variants={itemVariants}>
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-12 w-12">
                            {team.avatar && (
                              <img src={team.avatar} alt={team.name} />
                            )}
                          </Avatar>
                          <div>
                            <CardTitle className="flex items-center space-x-2">
                              <span>{team.name}</span>
                              {getVisibilityIcon(team.visibility)}
                            </CardTitle>
                            <div className="flex items-center space-x-2 mt-1">
                              {team.members.find(m => m.userId === currentUser?.id) && (
                                <Badge variant={getRoleBadgeVariant(team.members.find(m => m.userId === currentUser?.id)!.role)}>
                                  {getRoleIcon(team.members.find(m => m.userId === currentUser?.id)!.role)}
                                  <span className="ml-1">{team.members.find(m => m.userId === currentUser?.id)!.role}</span>
                                </Badge>
                              )}
                              <Badge variant="outline">
                                {team.members.length}/{team.maxMembers} members
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setSelectedTeam(team)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setTeamToInvite(team.id);
                                setShowInviteDialog(true);
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Invite Member
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onLeaveTeam?.(team.id)}>
                              <UserMinus className="h-4 w-4 mr-2" />
                              Leave Team
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-carbon-600">{team.description}</p>
                      
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-green-600">
                            {team.currentScore.toFixed(2)}
                          </div>
                          <div className="text-caption text-carbon-500">avg CO₂</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-blue-600">
                            {team.activeChallenges}
                          </div>
                          <div className="text-caption text-carbon-500">challenges</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-yellow-600">
                            {team.achievements}
                          </div>
                          <div className="text-caption text-carbon-500">achievements</div>
                        </div>
                      </div>

                      {team.carbonGoal && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-caption">
                            <span>Carbon Goal Progress</span>
                            <span>{((team.carbonGoal / team.currentScore) * 100).toFixed(0)}%</span>
                          </div>
                          <Progress value={(team.carbonGoal / team.currentScore) * 100} />
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {team.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                        {team.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{team.tags.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="discover" className="space-y-6">
          <div className="flex space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search teams by name, description, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Button variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid md:grid-cols-2 gap-6"
          >
            {filteredAvailableTeams.length === 0 ? (
              <div className="md:col-span-2 text-center py-12">
                <Search className="h-12 w-12 text-carbon-400 mx-auto mb-4" />
                <h3 className="text-h5 font-medium mb-2">No teams found</h3>
                <p className="text-carbon-600">
                  Try adjusting your search terms or create a new team
                </p>
              </div>
            ) : (
              filteredAvailableTeams.map((team) => (
                <motion.div key={team.id} variants={itemVariants}>
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-12 w-12">
                            {team.avatar && (
                              <img src={team.avatar} alt={team.name} />
                            )}
                          </Avatar>
                          <div>
                            <CardTitle className="flex items-center space-x-2">
                              <span>{team.name}</span>
                              {getVisibilityIcon(team.visibility)}
                            </CardTitle>
                            <Badge variant="outline" className="mt-1">
                              {team.members.length}/{team.maxMembers} members
                            </Badge>
                          </div>
                        </div>
                        
                        <Button
                          onClick={() => onJoinTeam?.(team.id)}
                          disabled={team.members.length >= team.maxMembers}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          {team.visibility === 'invite-only' ? 'Request Join' : 'Join'}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-carbon-600">{team.description}</p>
                      
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-green-600">
                            {team.currentScore.toFixed(2)}
                          </div>
                          <div className="text-caption text-carbon-500">avg CO₂</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-blue-600">
                            {team.activeChallenges}
                          </div>
                          <div className="text-caption text-carbon-500">challenges</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-yellow-600">
                            {team.achievements}
                          </div>
                          <div className="text-caption text-carbon-500">achievements</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {team.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="invites" className="space-y-6">
          {invites.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Mail className="h-12 w-12 text-carbon-400 mx-auto mb-4" />
                <h3 className="text-h5 font-medium mb-2">No pending invites</h3>
                <p className="text-carbon-600">
                  Team invitations will appear here when you receive them
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {invites.map((invite) => (
                <Card key={invite.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{invite.teamName}</h3>
                        <p className="text-carbon-600">
                          Invited by {invite.invitedBy} • {invite.invitedAt.toLocaleDateString()}
                        </p>
                        {invite.message && (
                          <p className="text-carbon-500 text-sm mt-1">"{invite.message}"</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => onAcceptInvite?.(invite.id)}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDeclineInvite?.(invite.id)}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Team Creation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Team Name</label>
                  <Input
                    value={newTeam.name}
                    onChange={(e) => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter team name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Visibility</label>
                  <Select
                    value={newTeam.visibility}
                    onValueChange={(value) => setNewTeam(prev => ({ ...prev, visibility: value as TeamVisibility }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="invite-only">Invite Only</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  value={newTeam.description}
                  onChange={(e) => setNewTeam(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your team's goals and focus areas"
                />
              </div>

              <Button onClick={handleCreateTeam} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Team Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Team Name *</label>
                <Input
                  value={newTeam.name}
                  onChange={(e) => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter team name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Max Members</label>
                <Select
                  value={newTeam.maxMembers?.toString()}
                  onValueChange={(value) => setNewTeam(prev => ({ ...prev, maxMembers: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 members</SelectItem>
                    <SelectItem value="10">10 members</SelectItem>
                    <SelectItem value="20">20 members</SelectItem>
                    <SelectItem value="50">50 members</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description *</label>
              <Textarea
                value={newTeam.description}
                onChange={(e) => setNewTeam(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your team's goals, focus areas, and what kind of members you're looking for"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Visibility</label>
                <Select
                  value={newTeam.visibility}
                  onValueChange={(value) => setNewTeam(prev => ({ ...prev, visibility: value as TeamVisibility }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public - Anyone can join</SelectItem>
                    <SelectItem value="invite-only">Invite Only - Approval required</SelectItem>
                    <SelectItem value="private">Private - Invitation only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Team Size</label>
                <Select
                  value={newTeam.size}
                  onValueChange={(value) => setNewTeam(prev => ({ ...prev, size: value as TeamSize }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small (2-10 members)</SelectItem>
                    <SelectItem value="medium">Medium (10-25 members)</SelectItem>
                    <SelectItem value="large">Large (25+ members)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTeam}>
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <Input
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                placeholder="Enter username to invite"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleInviteUser}>
                <Mail className="h-4 w-4 mr-2" />
                Send Invite
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};