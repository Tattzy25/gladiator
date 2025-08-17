/**
 * GitHub API Integration
 * Handles real repository scanning, analysis, and pull request creation
 */

export interface GitHubRepository {
  owner: string;
  name: string;
  fullName: string;
  url: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  size: number;
  isPrivate: boolean;
  defaultBranch: string;
  lastUpdated: Date;
}

export interface FileContent {
  path: string;
  content: string;
  size: number;
  encoding: string;
  sha: string;
}

export interface RepositoryStructure {
  files: FileContent[];
  directories: string[];
  packageJson?: any;
  dependencies?: string[];
  devDependencies?: string[];
  scripts?: Record<string, string>;
  hasTests: boolean;
  hasDocumentation: boolean;
  hasLinting: boolean;
  hasCI: boolean;
}

export interface SecurityVulnerability {
  severity: 'low' | 'moderate' | 'high' | 'critical';
  package: string;
  title: string;
  description: string;
  reference: string;
  patched_versions?: string;
  vulnerable_versions: string;
}

export interface PullRequestData {
  title: string;
  body: string;
  head: string;
  base: string;
  changes: FileChange[];
}

export interface FileChange {
  path: string;
  content: string;
  operation: 'create' | 'update' | 'delete';
}

export class GitHubService {
  private token: string;
  private baseUrl = 'https://api.github.com';

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN || '';
    if (!this.token) {
      console.warn('GitHub token not provided. Some features may be limited.');
    }
  }

  private get headers() {
    return {
      'Authorization': `token ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'AI-Gladiator-System/1.0'
    };
  }

  /**
   * Fetch repository information
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    try {
      const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}`, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        owner: data.owner.login,
        name: data.name,
        fullName: data.full_name,
        url: data.html_url,
        description: data.description || '',
        language: data.language || 'Unknown',
        stars: data.stargazers_count,
        forks: data.forks_count,
        size: data.size,
        isPrivate: data.private,
        defaultBranch: data.default_branch,
        lastUpdated: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Error fetching repository:', error);
      throw error;
    }
  }

  /**
   * Get repository structure and file contents
   */
  async getRepositoryStructure(owner: string, repo: string, branch: string = 'main'): Promise<RepositoryStructure> {
    try {
      const tree = await this.getRepositoryTree(owner, repo, branch);
      const structure: RepositoryStructure = {
        files: [],
        directories: [],
        hasTests: false,
        hasDocumentation: false,
        hasLinting: false,
        hasCI: false
      };

      // Analyze repository structure
      for (const item of tree) {
        if (item.type === 'tree') {
          structure.directories.push(item.path);
        } else if (item.type === 'blob') {
          // Check for important files
          this.analyzeFilePath(item.path, structure);
          
          // Get content for key files
          if (this.shouldFetchFileContent(item.path)) {
            try {
              const content = await this.getFileContent(owner, repo, item.path, branch);
              structure.files.push(content);
              
              // Special handling for package.json
              if (item.path === 'package.json') {
                await this.parsePackageJson(content, structure);
              }
            } catch (error) {
              console.warn(`Could not fetch content for ${item.path}:`, error);
            }
          }
        }
      }

      return structure;
    } catch (error) {
      console.error('Error getting repository structure:', error);
      throw error;
    }
  }

  private async getRepositoryTree(owner: string, repo: string, branch: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
      headers: this.headers
    });

    if (!response.ok) {
      throw new Error(`Failed to get repository tree: ${response.status}`);
    }

    const data = await response.json();
    return data.tree || [];
  }

  private analyzeFilePath(path: string, structure: RepositoryStructure): void {
    const lowerPath = path.toLowerCase();
    
    // Check for tests
    if (lowerPath.includes('test') || lowerPath.includes('spec') || 
        lowerPath.includes('__tests__') || lowerPath.endsWith('.test.js') || 
        lowerPath.endsWith('.spec.js') || lowerPath.endsWith('.test.ts') || 
        lowerPath.endsWith('.spec.ts')) {
      structure.hasTests = true;
    }
    
    // Check for documentation
    if (lowerPath.includes('readme') || lowerPath.includes('doc') || 
        lowerPath.includes('documentation') || lowerPath.endsWith('.md')) {
      structure.hasDocumentation = true;
    }
    
    // Check for linting
    if (lowerPath.includes('eslint') || lowerPath.includes('prettier') || 
        lowerPath.includes('lint') || path === '.eslintrc.js' || 
        path === '.prettierrc' || path === 'eslint.config.js') {
      structure.hasLinting = true;
    }
    
    // Check for CI/CD
    if (lowerPath.includes('.github/workflows') || lowerPath.includes('.circleci') || 
        lowerPath.includes('jenkins') || lowerPath.includes('travis') || 
        path === '.github/workflows/ci.yml' || path === 'Jenkinsfile') {
      structure.hasCI = true;
    }
  }

  private shouldFetchFileContent(path: string): boolean {
    const importantFiles = [
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'Dockerfile',
      'docker-compose.yml',
      '.env.example',
      'README.md',
      'SECURITY.md',
      '.gitignore',
      'eslint.config.js',
      '.eslintrc.js',
      'tsconfig.json'
    ];
    
    const importantPatterns = [
      /^src\/.*\.(js|ts|jsx|tsx)$/,
      /^api\/.*\.(js|ts)$/,
      /^routes\/.*\.(js|ts)$/,
      /^controllers\/.*\.(js|ts)$/,
      /^middleware\/.*\.(js|ts)$/,
      /^config\/.*\.(js|ts|json)$/,
      /\.env$/,
      /security.*\.(js|ts|json|md)$/i,
      /auth.*\.(js|ts)$/i
    ];

    if (importantFiles.includes(path)) return true;
    
    return importantPatterns.some(pattern => pattern.test(path));
  }

  private async getFileContent(owner: string, repo: string, path: string, branch: string): Promise<FileContent> {
    const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`, {
      headers: this.headers
    });

    if (!response.ok) {
      throw new Error(`Failed to get file content: ${response.status}`);
    }

    const data = await response.json();
    
    let content = '';
    if (data.encoding === 'base64') {
      content = Buffer.from(data.content, 'base64').toString('utf-8');
    } else {
      content = data.content;
    }

    return {
      path: data.path,
      content,
      size: data.size,
      encoding: data.encoding,
      sha: data.sha
    };
  }

  private async parsePackageJson(file: FileContent, structure: RepositoryStructure): Promise<void> {
    try {
      const packageData = JSON.parse(file.content);
      structure.packageJson = packageData;
      
      if (packageData.dependencies) {
        structure.dependencies = Object.keys(packageData.dependencies);
      }
      
      if (packageData.devDependencies) {
        structure.devDependencies = Object.keys(packageData.devDependencies);
      }
      
      if (packageData.scripts) {
        structure.scripts = packageData.scripts;
      }
    } catch (error) {
      console.warn('Failed to parse package.json:', error);
    }
  }

  /**
   * Check for security vulnerabilities using GitHub's security advisory API
   */
  async getSecurityVulnerabilities(owner: string, repo: string): Promise<SecurityVulnerability[]> {
    try {
      const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/vulnerability-alerts`, {
        headers: {
          ...this.headers,
          'Accept': 'application/vnd.github.dorian-preview+json'
        }
      });

      if (!response.ok) {
        // If no access to vulnerability alerts, return empty array
        return [];
      }

      const vulnerabilities = await response.json();
      
      return vulnerabilities.map((vuln: any) => ({
        severity: vuln.security_advisory.severity,
        package: vuln.package.name,
        title: vuln.security_advisory.summary,
        description: vuln.security_advisory.description,
        reference: vuln.security_advisory.references[0]?.url || '',
        patched_versions: vuln.security_advisory.patched_versions,
        vulnerable_versions: vuln.vulnerable_version_range
      }));
    } catch (error) {
      console.warn('Could not fetch security vulnerabilities:', error);
      return [];
    }
  }

  /**
   * Create a pull request with fixes
   */
  async createPullRequest(owner: string, repo: string, pullRequest: PullRequestData): Promise<any> {
    try {
      // First, create a new branch
      const branchName = `gladiator-fixes-${Date.now()}`;
      await this.createBranch(owner, repo, branchName, pullRequest.base);
      
      // Apply changes to the branch
      for (const change of pullRequest.changes) {
        await this.updateFile(owner, repo, change.path, change.content, branchName, change.operation);
      }
      
      // Create the pull request
      const prResponse = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/pulls`, {
        method: 'POST',
        headers: {
          ...this.headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: pullRequest.title,
          body: pullRequest.body,
          head: branchName,
          base: pullRequest.base
        })
      });

      if (!prResponse.ok) {
        throw new Error(`Failed to create pull request: ${prResponse.status}`);
      }

      return await prResponse.json();
    } catch (error) {
      console.error('Error creating pull request:', error);
      throw error;
    }
  }

  private async createBranch(owner: string, repo: string, branchName: string, baseBranch: string): Promise<void> {
    // Get the SHA of the base branch
    const baseResponse = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`, {
      headers: this.headers
    });

    if (!baseResponse.ok) {
      throw new Error(`Failed to get base branch: ${baseResponse.status}`);
    }

    const baseData = await baseResponse.json();
    const baseSha = baseData.object.sha;

    // Create the new branch
    const branchResponse = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: baseSha
      })
    });

    if (!branchResponse.ok) {
      throw new Error(`Failed to create branch: ${branchResponse.status}`);
    }
  }

  private async updateFile(owner: string, repo: string, path: string, content: string, branch: string, operation: 'create' | 'update' | 'delete'): Promise<void> {
    const encodedContent = Buffer.from(content).toString('base64');
    
    let requestBody: any = {
      message: `AI Gladiator: ${operation} ${path}`,
      content: encodedContent,
      branch: branch
    };

    if (operation === 'update') {
      // Need to get the current file SHA for updates
      try {
        const fileResponse = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`, {
          headers: this.headers
        });
        
        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          requestBody.sha = fileData.sha;
        }
      } catch (error) {
        console.warn(`Could not get current file SHA for ${path}:`, error);
      }
    }

    const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
      method: 'PUT',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Failed to ${operation} file ${path}: ${response.status}`);
    }
  }

  /**
   * Get repository contributors for ownership verification
   */
  async getRepositoryContributors(owner: string, repo: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/contributors`, {
        headers: this.headers
      });

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      console.warn('Could not fetch contributors:', error);
      return [];
    }
  }

  /**
   * Verify if the current user has write access to the repository
   */
  async hasWriteAccess(owner: string, repo: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}`, {
        headers: this.headers
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.permissions?.push === true || data.permissions?.admin === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Parse repository URL to extract owner and repo name
   */
  static parseRepositoryUrl(url: string): { owner: string; repo: string } | null {
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?(?:\/)?$/,
      /github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/[^\/]+)?(?:\/)?$/,
      /^([^\/]+)\/([^\/]+)$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, '')
        };
      }
    }

    return null;
  }

  /**
   * Validate repository access and return repository info
   */
  async validateRepository(repositoryUrl: string): Promise<GitHubRepository | null> {
    const parsed = GitHubService.parseRepositoryUrl(repositoryUrl);
    if (!parsed) {
      throw new Error('Invalid GitHub repository URL');
    }

    try {
      return await this.getRepository(parsed.owner, parsed.repo);
    } catch (error) {
      console.error('Repository validation failed:', error);
      return null;
    }
  }
}

// Create singleton instance
export const gitHubService = new GitHubService();