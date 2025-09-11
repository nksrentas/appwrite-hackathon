import { logger } from '@shared/utils/logger';
import { ActivityService } from '@shared/database/base';
import { 
  GitHubActivityData,
  GitHubRepository,
  GitHubIntegrationError 
} from '../types';
import { Activity } from '@shared/types/database';

export class GitHubCarbonIntegrationService {
  
  /**
   * Process GitHub activity data and create carbon trackable activity
   */
  async processGitHubActivity(
    userId: string,
    repository: GitHubRepository,
    activityData: GitHubActivityData
  ): Promise<Activity> {
    try {
      logger.github('Processing GitHub activity for carbon calculation', {
        userId,
        repositoryId: repository.github_repo_id,
        activityType: activityData.type,
        timestamp: activityData.timestamp
      });

      // Transform GitHub activity data to carbon calculation format
      const carbonActivity = await this.transformToActivityFormat(
        userId,
        repository,
        activityData
      );

      // Create activity record
      const result = await ActivityService.createActivity({
        activityData: carbonActivity
      });

      logger.github('GitHub activity processed for carbon calculation', {
        userId,
        repositoryId: repository.github_repo_id,
        activityId: result.activity.$id,
        activityType: activityData.type,
        carbonKg: result.activity.carbon_kg,
        confidence: result.activity.calculation_confidence
      });

      // Trigger carbon calculation if needed
      await this.triggerCarbonCalculation(result.activity);

      return result.activity;

    } catch (error) {
      logger.githubError('Failed to process GitHub activity for carbon calculation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        repositoryId: repository.github_repo_id,
        activityType: activityData.type
      });
      throw new GitHubIntegrationError(
        'CARBON_INTEGRATION_ERROR',
        'Failed to process GitHub activity for carbon calculation'
      );
    }
  }

  /**
   * Transform GitHub activity data to Activity format for carbon calculation
   */
  private async transformToActivityFormat(
    userId: string,
    repository: GitHubRepository,
    activityData: GitHubActivityData
  ): Promise<Omit<Activity, '$id' | '$createdAt'>> {
    const baseActivity = {
      user_id: userId,
      type: this.mapActivityType(activityData.type),
      carbon_kg: 0, // Will be calculated by carbon engine
      calculation_confidence: 'low' as const,
      timestamp: activityData.timestamp
    };

    // Map repository information
    const repositoryInfo = {
      name: activityData.repository.name,
      full_name: activityData.repository.full_name,
      private: activityData.repository.private
    };

    switch (activityData.type) {
      case 'commit':
        return {
          ...baseActivity,
          repository: repositoryInfo,
          commit: activityData.commit ? {
            sha: activityData.commit.sha,
            message: activityData.commit.message,
            additions: activityData.commit.additions,
            deletions: activityData.commit.deletions,
            changed_files: activityData.commit.changed_files
          } : undefined
        };

      case 'ci_run':
        return {
          ...baseActivity,
          repository: repositoryInfo,
          ci_data: activityData.ci_data ? {
            provider: activityData.ci_data.provider,
            duration_seconds: activityData.ci_data.duration_seconds,
            success: activityData.ci_data.success,
            runner_type: activityData.ci_data.runner_type
          } : undefined
        };

      case 'pr':
        // Map PR data to commit data for carbon calculation
        const prCommitData = activityData.pr_data ? {
          sha: 'pr_' + Date.now(), // Generate unique identifier
          message: `Pull request merged: ${activityData.metadata?.title || 'Untitled'}`,
          additions: activityData.pr_data.additions,
          deletions: activityData.pr_data.deletions,
          changed_files: activityData.pr_data.changed_files
        } : undefined;

        return {
          ...baseActivity,
          type: 'pr',
          repository: repositoryInfo,
          commit: prCommitData
        };

      default:
        throw new GitHubIntegrationError(
          'UNSUPPORTED_ACTIVITY_TYPE',
          `Unsupported activity type: ${activityData.type}`
        );
    }
  }

  /**
   * Map GitHub activity type to carbon calculation activity type
   */
  private mapActivityType(githubType: string): Activity['type'] {
    switch (githubType) {
      case 'commit':
        return 'commit';
      case 'ci_run':
        return 'ci_run';
      case 'pr':
        return 'pr';
      case 'deployment':
        return 'deployment';
      default:
        return 'commit'; // Default fallback
    }
  }

  /**
   * Trigger carbon calculation for the activity
   */
  private async triggerCarbonCalculation(activity: Activity): Promise<void> {
    try {
      // Here you would integrate with your existing carbon calculation engine
      // This is a placeholder for the integration point
      
      logger.github('Carbon calculation triggered for GitHub activity', {
        activityId: activity.$id,
        activityType: activity.type,
        userId: activity.user_id
      });

      // Example integration points:
      // 1. Add to calculation queue
      // 2. Trigger immediate calculation
      // 3. Schedule background processing
      // 4. Send to external carbon calculation service

      // For now, we'll just log that calculation should be triggered
      // In your implementation, you would call your carbon calculation service here

    } catch (error) {
      logger.githubError('Failed to trigger carbon calculation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        activityId: activity.$id
      });
      // Don't throw error here as activity was created successfully
    }
  }

  /**
   * Estimate carbon footprint for different GitHub activity types
   */
  async estimateCarbonFootprint(activityData: GitHubActivityData): Promise<{
    estimatedKg: number;
    confidence: 'high' | 'medium' | 'low';
    factors: string[];
  }> {
    try {
      let estimatedKg = 0;
      const factors: string[] = [];
      let confidence: 'high' | 'medium' | 'low' = 'low';

      switch (activityData.type) {
        case 'commit':
          // Estimate based on commit size and complexity
          if (activityData.commit) {
            const changes = activityData.commit.additions + activityData.commit.deletions;
            const files = activityData.commit.changed_files;
            
            // Base calculation: ~0.1g CO2 per line changed
            estimatedKg = (changes * 0.0001) + (files * 0.0005);
            factors.push('lines_changed', 'files_modified');
            confidence = 'medium';
          }
          break;

        case 'ci_run':
          // Estimate based on CI/CD runtime
          if (activityData.ci_data) {
            const durationMinutes = activityData.ci_data.duration_seconds / 60;
            
            // Base calculation: ~2g CO2 per minute of CI/CD runtime
            estimatedKg = durationMinutes * 0.002;
            
            // Adjust for runner type
            if (activityData.ci_data.runner_type.includes('large')) {
              estimatedKg *= 2;
              factors.push('large_runner');
            }
            
            factors.push('runtime_duration', 'runner_type');
            confidence = 'high';
          }
          break;

        case 'pr':
          // Estimate based on PR size
          if (activityData.pr_data) {
            const changes = activityData.pr_data.additions + activityData.pr_data.deletions;
            const files = activityData.pr_data.changed_files;
            
            // PR typically involves review overhead
            estimatedKg = (changes * 0.0002) + (files * 0.001);
            factors.push('pr_size', 'review_overhead');
            confidence = 'medium';
          }
          break;

        default:
          // Default minimal estimation
          estimatedKg = 0.001;
          factors.push('default_estimation');
          confidence = 'low';
      }

      // Apply repository-specific factors
      if (activityData.repository.private) {
        // Private repos might have different infrastructure
        estimatedKg *= 1.1;
        factors.push('private_repository');
      }

      // Apply language-specific factors
      if (activityData.repository.language) {
        const languageMultiplier = this.getLanguageMultiplier(activityData.repository.language);
        estimatedKg *= languageMultiplier;
        factors.push(`language_${activityData.repository.language.toLowerCase()}`);
      }

      logger.github('Carbon footprint estimated for GitHub activity', {
        activityType: activityData.type,
        estimatedKg,
        confidence,
        factors
      });

      return {
        estimatedKg: Math.max(estimatedKg, 0.0001), // Minimum 0.1g
        confidence,
        factors
      };

    } catch (error) {
      logger.githubError('Failed to estimate carbon footprint', {
        error: error instanceof Error ? error.message : 'Unknown error',
        activityType: activityData.type
      });

      return {
        estimatedKg: 0.001, // Default minimal value
        confidence: 'low',
        factors: ['estimation_error']
      };
    }
  }

  /**
   * Get carbon multiplier based on programming language
   */
  private getLanguageMultiplier(language: string): number {
    const languageMultipliers: Record<string, number> = {
      // Compiled languages (typically higher build costs)
      'rust': 1.3,
      'go': 1.2,
      'c++': 1.4,
      'c': 1.4,
      'java': 1.3,
      'kotlin': 1.3,
      'swift': 1.2,
      
      // Interpreted languages (typically lower build costs)
      'javascript': 1.0,
      'typescript': 1.1,
      'python': 1.0,
      'ruby': 1.0,
      'php': 1.0,
      
      // Web technologies
      'html': 0.8,
      'css': 0.8,
      'scss': 0.9,
      
      // Documentation and config
      'markdown': 0.5,
      'yaml': 0.5,
      'json': 0.5,
      'xml': 0.6,
      
      // Default for unknown languages
      'unknown': 1.0
    };

    return languageMultipliers[language.toLowerCase()] || languageMultipliers['unknown'];
  }

  /**
   * Batch process multiple GitHub activities
   */
  async batchProcessActivities(
    userId: string,
    repository: GitHubRepository,
    activities: GitHubActivityData[]
  ): Promise<Activity[]> {
    const processedActivities: Activity[] = [];
    const errors: Error[] = [];

    logger.github('Batch processing GitHub activities', {
      userId,
      repositoryId: repository.github_repo_id,
      activitiesCount: activities.length
    });

    for (const activityData of activities) {
      try {
        const activity = await this.processGitHubActivity(userId, repository, activityData);
        processedActivities.push(activity);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error('Unknown error'));
        logger.githubError('Failed to process activity in batch', {
          error: error instanceof Error ? error.message : 'Unknown error',
          activityType: activityData.type,
          timestamp: activityData.timestamp
        });
      }
    }

    logger.github('Batch processing completed', {
      userId,
      repositoryId: repository.github_repo_id,
      processedCount: processedActivities.length,
      errorCount: errors.length
    });

    return processedActivities;
  }

  /**
   * Get carbon calculation summary for a repository
   */
  async getRepositoryCarbonSummary(
    userId: string,
    repositoryId: number,
    timeframe: { start: string; end: string }
  ): Promise<{
    totalCarbonKg: number;
    activitiesCount: number;
    averageCarbonPerActivity: number;
    breakdown: {
      commits: { count: number; carbonKg: number };
      ciRuns: { count: number; carbonKg: number };
      pullRequests: { count: number; carbonKg: number };
    };
  }> {
    try {
      // This would integrate with your existing activity service
      // to get carbon data for the repository within the timeframe
      
      logger.github('Generating carbon summary for repository', {
        userId,
        repositoryId,
        timeframe
      });

      // Placeholder implementation
      // In real implementation, you would query the activities table
      // and aggregate carbon data by type
      
      return {
        totalCarbonKg: 0,
        activitiesCount: 0,
        averageCarbonPerActivity: 0,
        breakdown: {
          commits: { count: 0, carbonKg: 0 },
          ciRuns: { count: 0, carbonKg: 0 },
          pullRequests: { count: 0, carbonKg: 0 }
        }
      };

    } catch (error) {
      logger.githubError('Failed to generate repository carbon summary', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        repositoryId
      });
      throw error;
    }
  }
}