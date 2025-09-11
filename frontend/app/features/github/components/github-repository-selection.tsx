import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from '@remix-run/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  Circle, 
  Star, 
  GitFork, 
  Lock, 
  Globe, 
  Building, 
  User,
  Loader2,
  RefreshCw,
  ChevronDown,
  AlertCircle,
  Check
} from 'lucide-react';

import { Button } from '~/shared/components/ui/button';
import { Input } from '~/shared/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/shared/components/ui/card';
import { Badge } from '~/shared/components/ui/badge';
import { Switch } from '~/shared/components/ui/switch';
import { Alert, AlertDescription } from '~/shared/components/ui/alert';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger, 
  DropdownMenuCheckboxItem, 
  DropdownMenuSeparator, 
  DropdownMenuLabel 
} from '~/shared/components/ui/dropdown-menu';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/shared/components/ui/select';

import { useGitHubStore } from '../stores/github.store';
import { githubService } from '../services/github.service';
import { useToast } from '~/shared/hooks/use-toast';
import type { GitHubRepository } from '../types/github.types';

const LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 
  'C++', 'C#', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'HTML', 'CSS'
];

export function GitHubRepositorySelection() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const {
    repositories,
    repositoriesLoading,
    repositoriesError,
    selectedRepositoryIds,
    repositorySelection,
    isConnected,
    loadRepositories,
    enableRepositoryTracking,
    updateRepositorySelection,
    toggleRepositorySelection,
    selectAllRepositories,
    clearRepositorySelection,
    clearError
  } = useGitHubStore();

  const [saving, setSaving] = useState(false);

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) {
      navigate('/integrations/github/setup');
    }
  }, [isConnected, navigate]);

  // Load repositories on mount
  useEffect(() => {
    if (isConnected) {
      loadRepositories({ refresh: true });
    }
  }, [isConnected, loadRepositories]);

  // Filter and sort repositories
  const filteredRepositories = useMemo(() => {
    let filtered = repositories;

    // Search filter
    if (repositorySelection.searchQuery) {
      const query = repositorySelection.searchQuery.toLowerCase();
      filtered = filtered.filter(repo => 
        repo.name.toLowerCase().includes(query) ||
        repo.fullName.toLowerCase().includes(query) ||
        repo.description?.toLowerCase().includes(query)
      );
    }

    // Visibility filter
    if (repositorySelection.filters.visibility !== 'all') {
      filtered = filtered.filter(repo => 
        repositorySelection.filters.visibility === 'private' ? repo.private : !repo.private
      );
    }

    // Ownership filter
    if (repositorySelection.filters.ownership !== 'all') {
      filtered = filtered.filter(repo => {
        switch (repositorySelection.filters.ownership) {
          case 'owner':
            return repo.isOwner && repo.owner.type === 'User';
          case 'collaborator':
            return !repo.isOwner && repo.owner.type === 'User';
          case 'organization':
            return repo.owner.type === 'Organization';
          default:
            return true;
        }
      });
    }

    // Language filter
    if (repositorySelection.filters.language) {
      filtered = filtered.filter(repo => 
        repo.language === repositorySelection.filters.language
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (repositorySelection.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'updated':
          comparison = new Date(b.lastPushAt).getTime() - new Date(a.lastPushAt).getTime();
          break;
        case 'stars':
          comparison = b.stargazersCount - a.stargazersCount;
          break;
        case 'size':
          comparison = b.size - a.size;
          break;
      }

      return repositorySelection.sortDirection === 'desc' ? comparison : -comparison;
    });

    return filtered;
  }, [repositories, repositorySelection]);

  const handleSaveSelection = async () => {
    if (selectedRepositoryIds.size === 0) {
      toast({
        title: 'No Repositories Selected',
        description: 'Please select at least one repository to track.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      await enableRepositoryTracking(Array.from(selectedRepositoryIds));
      
      toast({
        title: 'Repositories Configured!',
        description: `${selectedRepositoryIds.size} repositories are now being tracked.`,
      });

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to save repository selection:', error);
      toast({
        title: 'Configuration Failed',
        description: error instanceof Error ? error.message : 'Failed to configure repository tracking',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = selectedRepositoryIds.size;
  const totalCount = filteredRepositories.length;

  if (!isConnected) {
    return null;
  }

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Select Repositories to Track
          </h1>
          <p className="text-lg text-gray-600">
            Choose which repositories you'd like to monitor for carbon footprint tracking
          </p>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search repositories..."
                    value={repositorySelection.searchQuery}
                    onChange={(e) => updateRepositorySelection({ searchQuery: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuLabel>Visibility</DropdownMenuLabel>
                    <DropdownMenuCheckboxItem
                      checked={repositorySelection.filters.visibility === 'all'}
                      onCheckedChange={() => updateRepositorySelection({ 
                        filters: { ...repositorySelection.filters, visibility: 'all' } 
                      })}
                    >
                      All repositories
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={repositorySelection.filters.visibility === 'public'}
                      onCheckedChange={() => updateRepositorySelection({ 
                        filters: { ...repositorySelection.filters, visibility: 'public' } 
                      })}
                    >
                      Public only
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={repositorySelection.filters.visibility === 'private'}
                      onCheckedChange={() => updateRepositorySelection({ 
                        filters: { ...repositorySelection.filters, visibility: 'private' } 
                      })}
                    >
                      Private only
                    </DropdownMenuCheckboxItem>
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Ownership</DropdownMenuLabel>
                    <DropdownMenuCheckboxItem
                      checked={repositorySelection.filters.ownership === 'all'}
                      onCheckedChange={() => updateRepositorySelection({ 
                        filters: { ...repositorySelection.filters, ownership: 'all' } 
                      })}
                    >
                      All types
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={repositorySelection.filters.ownership === 'owner'}
                      onCheckedChange={() => updateRepositorySelection({ 
                        filters: { ...repositorySelection.filters, ownership: 'owner' } 
                      })}
                    >
                      Owned by me
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={repositorySelection.filters.ownership === 'collaborator'}
                      onCheckedChange={() => updateRepositorySelection({ 
                        filters: { ...repositorySelection.filters, ownership: 'collaborator' } 
                      })}
                    >
                      Collaborator
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={repositorySelection.filters.ownership === 'organization'}
                      onCheckedChange={() => updateRepositorySelection({ 
                        filters: { ...repositorySelection.filters, ownership: 'organization' } 
                      })}
                    >
                      Organization
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Select
                  value={repositorySelection.filters.language || 'all'}
                  onValueChange={(value) => updateRepositorySelection({
                    filters: { 
                      ...repositorySelection.filters, 
                      language: value === 'all' ? null : value 
                    }
                  })}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All languages</SelectItem>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={`${repositorySelection.sortBy}-${repositorySelection.sortDirection}`}
                  onValueChange={(value) => {
                    const [sortBy, sortDirection] = value.split('-') as [any, 'asc' | 'desc'];
                    updateRepositorySelection({ sortBy, sortDirection });
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updated-desc">Recently updated</SelectItem>
                    <SelectItem value="name-asc">Name A-Z</SelectItem>
                    <SelectItem value="name-desc">Name Z-A</SelectItem>
                    <SelectItem value="stars-desc">Most stars</SelectItem>
                    <SelectItem value="size-desc">Largest</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadRepositories({ refresh: true })}
                  disabled={repositoriesLoading}
                >
                  {repositoriesLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Selection controls */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {selectedCount} of {totalCount} repositories selected
                </span>
                {totalCount > 0 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAllRepositories}
                    >
                      Select all
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearRepositorySelection}
                    >
                      Clear selection
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error display */}
        {repositoriesError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {repositoriesError}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearError('repositories')}
                className="ml-2"
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Repository list */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          <AnimatePresence>
            {repositoriesLoading && filteredRepositories.length === 0 ? (
              Array.from({ length: 6 }).map((_, index) => (
                <motion.div
                  key={`skeleton-${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-32 bg-gray-100 rounded-lg animate-pulse"
                />
              ))
            ) : (
              filteredRepositories.map((repo) => (
                <motion.div
                  key={repo.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <RepositoryCard
                    repository={repo}
                    isSelected={selectedRepositoryIds.has(repo.id)}
                    onToggle={() => toggleRepositorySelection(repo.id)}
                  />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {!repositoriesLoading && filteredRepositories.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No repositories found</h3>
            <p className="text-gray-600 mb-4">
              {repositorySelection.searchQuery || Object.values(repositorySelection.filters).some(f => f && f !== 'all')
                ? 'Try adjusting your search criteria or filters'
                : 'No repositories available for tracking'}
            </p>
            {Object.values(repositorySelection.filters).some(f => f && f !== 'all') && (
              <Button
                variant="outline"
                onClick={() => updateRepositorySelection({
                  searchQuery: '',
                  filters: {
                    visibility: 'all',
                    ownership: 'all',
                    language: null
                  }
                })}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* Action buttons */}
        {filteredRepositories.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold mb-1">Ready to start tracking?</h3>
                  <p className="text-sm text-gray-600">
                    {selectedCount > 0 
                      ? `${selectedCount} repositories will be monitored for carbon footprint tracking`
                      : 'Select repositories to begin monitoring their carbon impact'
                    }
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/integrations/github/setup')}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSaveSelection}
                    disabled={selectedCount === 0 || saving}
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    {saving ? 'Configuring...' : `Track ${selectedCount} Repositories`}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}

interface RepositoryCardProps {
  repository: GitHubRepository;
  isSelected: boolean;
  onToggle: () => void;
}

function RepositoryCard({ repository, isSelected, onToggle }: RepositoryCardProps) {
  const languageColor = githubService.getRepositoryLanguageColor(repository.language);
  const sizeFormatted = githubService.formatRepositorySize(repository.size * 1024); // GitHub API returns size in KB
  const timeSinceUpdate = new Date().getTime() - new Date(repository.lastPushAt).getTime();
  const daysSinceUpdate = Math.floor(timeSinceUpdate / (1000 * 60 * 60 * 24));

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:border-gray-300'
      }`}
      onClick={onToggle}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center gap-2">
                {isSelected ? (
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
                <h3 className="font-medium text-sm truncate">{repository.name}</h3>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {repository.private ? (
                  <Lock className="w-4 h-4 text-amber-600" />
                ) : (
                  <Globe className="w-4 h-4 text-green-600" />
                )}
                {repository.owner.type === 'Organization' && (
                  <Building className="w-4 h-4 text-blue-600" />
                )}
              </div>
            </div>
            
            {repository.description && (
              <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                {repository.description}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-gray-500">
              {repository.language && (
                <div className="flex items-center gap-1">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: languageColor }}
                  />
                  <span>{repository.language}</span>
                </div>
              )}
              
              {repository.stargazersCount > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  <span>{repository.stargazersCount}</span>
                </div>
              )}
              
              {repository.forksCount > 0 && (
                <div className="flex items-center gap-1">
                  <GitFork className="w-3 h-3" />
                  <span>{repository.forksCount}</span>
                </div>
              )}
              
              <span>{sizeFormatted}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Updated {daysSinceUpdate === 0 ? 'today' : `${daysSinceUpdate}d ago`}
          </span>
          
          {repository.trackingEnabled && (
            <Badge variant="secondary" className="text-xs">
              Already tracking
            </Badge>
          )}
        </div>

        {isSelected && (
          <div className="mt-3 pt-3 border-t border-primary/20">
            <p className="text-xs text-primary">
              ✓ Will track commits, builds, deployments
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}