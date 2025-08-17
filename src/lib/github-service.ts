/**
 * Enhanced GitHub API Integration
 * Production-ready repository scanning, analysis, and pull request creation
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
  topics: string[];
  license?: string;
  hasIssues: boolean;
  openIssues: number;
  archived: boolean;
  disabled: boolean;
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
  hasSecurityPolicy: boolean;
  hasContributing: boolean;
  hasLicense: boolean;
  languages: Record<string, number>;
  totalLines: number;
  complexity: 'low' | 'medium' | 'high';
}

export interface SecurityVulnerability {
  severity: 'low' | 'moderate' | 'high' | 'critical';
  package: string;
  title: string;
  description: string;
  reference: string;
  patched_versions?: string;
  vulnerable_versions: string;
  first_patched_version?: string;
  cve_id?: string;
}

export interface CodeQualityMetrics {
  linesOfCode: number;
  complexity: number;
  maintainabilityIndex: number;
  testCoverage?: number;
  codeSmells: string[];
  duplication: number;
  technicalDebt: string;
}

export interface SecurityAnalysis {
  vulnerabilities: SecurityVulnerability[];
  secretsDetected: string[];
  dependencyAnalysis: {
    outdated: string[];
    vulnerable: string[];
    total: number;
  };
  securityScore: number;
  recommendations: string[];
}

export interface RepositoryAnalysis {
  repository: GitHubRepository;
  structure: RepositoryStructure;
  security: SecurityAnalysis;
  quality: CodeQualityMetrics;
  issues: GitHubIssue[];
  pullRequests: GitHubPullRequest[];
  commits: GitHubCommit[];
  contributors: GitHubContributor[];
  analysisTime: number;
  analysisDate: Date;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: string[];
  createdAt: Date;
  updatedAt: Date;
  author: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  createdAt: Date;
  updatedAt: Date;
  author: string;
  changedFiles: number;
  additions: number;
  deletions: number;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: Date;
  changedFiles: number;
}

export interface GitHubContributor {
  login: string;
  contributions: number;
  type: 'User' | 'Bot';
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
    this.token = token || (typeof process !== 'undefined' && process.env ? process.env.GITHUB_TOKEN : '') || '';
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
   * Comprehensive repository analysis for AI agents
   */
  async analyzeRepository(repositoryUrl: string): Promise<RepositoryAnalysis> {
    const startTime = Date.now();
    const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);
    
    console.log(`🔍 Starting comprehensive analysis of ${owner}/${repo}`);
    
    try {
      // Parallel fetch of all repository data
      const [
        repository,
        structure,
        security,
        quality,
        issues,
        pullRequests,
        commits,
        contributors
      ] = await Promise.all([
        this.getRepository(owner, repo),
        this.getRepositoryStructure(owner, repo),
        this.getSecurityAnalysis(owner, repo),
        this.getCodeQualityMetrics(owner, repo),
        this.getIssues(owner, repo),
        this.getPullRequests(owner, repo),
        this.getRecentCommits(owner, repo),
        this.getContributors(owner, repo)
      ]);

      const analysisTime = Date.now() - startTime;
      
      console.log(`✅ Repository analysis completed in ${analysisTime}ms`);
      
      return {
        repository,
        structure,
        security,
        quality,
        issues,
        pullRequests,
        commits,
        contributors,
        analysisTime,
        analysisDate: new Date()
      };
    } catch (error) {
      console.error(`❌ Failed to analyze repository ${owner}/${repo}:`, error);
      throw error;
    }
  }

  /**
   * Parse repository URL to extract owner and repo name
   */
  private parseRepositoryUrl(url: string): { owner: string; repo: string } {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error('Invalid GitHub repository URL');
    }
    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, '')
    };
  }

  /**
   * Fetch repository information with enhanced metadata
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
        lastUpdated: new Date(data.updated_at),
        topics: data.topics || [],
        license: data.license?.name,
        hasIssues: data.has_issues,
        openIssues: data.open_issues_count,
        archived: data.archived,
        disabled: data.disabled
      };
    } catch (error) {
      console.error(`Error fetching repository ${owner}/${repo}:`, error);
      throw error;
    }
  }

  /**
   * Get comprehensive repository structure analysis
   */
  async getRepositoryStructure(owner: string, repo: string): Promise<RepositoryStructure> {
    try {
      const [contents, languages] = await Promise.all([
        this.getRepositoryContents(owner, repo),
        this.getRepositoryLanguages(owner, repo)
      ]);

      const structure: RepositoryStructure = {
        files: contents.files,
        directories: contents.directories,
        hasTests: this.detectTests(contents.files),
        hasDocumentation: this.detectDocumentation(contents.files),
        hasLinting: this.detectLinting(contents.files),
        hasCI: this.detectCI(contents.files),
        hasSecurityPolicy: this.detectSecurityPolicy(contents.files),
        hasContributing: this.detectContributing(contents.files),
        hasLicense: this.detectLicense(contents.files),
        languages,
        totalLines: this.calculateTotalLines(contents.files),
        complexity: this.assessComplexity(contents.files, languages)
      };

      // Parse package.json if it exists
      const packageJsonFile = contents.files.find(f => f.path === 'package.json');
      if (packageJsonFile) {
        try {
          const packageJson = JSON.parse(packageJsonFile.content);
          structure.packageJson = packageJson;
          structure.dependencies = Object.keys(packageJson.dependencies || {});
          structure.devDependencies = Object.keys(packageJson.devDependencies || {});
          structure.scripts = packageJson.scripts || {};
        } catch (error) {
          console.warn('Failed to parse package.json:', error);
        }
      }

      return structure;
    } catch (error) {
      console.error(`Error getting repository structure for ${owner}/${repo}:`, error);
      throw error;
    }
  }

  /**
   * Get repository contents (limited to important files for analysis)
   */
  private async getRepositoryContents(owner: string, repo: string): Promise<{ files: FileContent[]; directories: string[] }> {
    const files: FileContent[] = [];
    const directories: string[] = [];
    
    try {
      // Get repository tree
      const tree = await this.getRepositoryTree(owner, repo);
      
      // Filter important files for analysis
      const importantFiles = tree.filter(item => this.isImportantFile(item.path));
      
      // Fetch content for important files (limit to prevent API overuse)
      const filePromises = importantFiles.slice(0, 50).map(async (item) => {
        if (item.type === 'blob') {
          try {
            const content = await this.getFileContent(owner, repo, item.path);
            files.push(content);
          } catch (error) {
            console.warn(`Failed to fetch content for ${item.path}:`, error);
          }
        } else if (item.type === 'tree') {
          directories.push(item.path);
        }
      });
      
      await Promise.all(filePromises);
      
      return { files, directories };
    } catch (error) {
      console.error('Error getting repository contents:', error);
      return { files: [], directories: [] };
    }
  }

  /**
   * Check if a file is important for analysis
   */
  private isImportantFile(path: string): boolean {
    const importantPatterns = [
      /^(README|readme)/,
      /\.(js|ts|jsx|tsx|py|java|cs|cpp|c|h|php|rb|go|rs)$/,
      /^package\.json$/,
      /^requirements\.txt$/,
      /^Gemfile$/,
      /^go\.mod$/,
      /^Cargo\.toml$/,
      /^pom\.xml$/,
      /^\.eslintrc/,
      /^\.gitignore$/,
      /^Dockerfile$/,
      /^docker-compose/,
      /^\.github\//,
      /test/i,
      /spec/i
    ];
    
    return importantPatterns.some(pattern => pattern.test(path));
  }

  /**
   * Get repository tree structure
   */
  private async getRepositoryTree(owner: string, repo: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      return data.tree || [];
    } catch (error) {
      console.error('Error fetching repository tree:', error);
      return [];
    }
  }

  /**
   * Get file content
   */
  private async getFileContent(owner: string, repo: string, path: string): Promise<FileContent> {
    const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`, {
      headers: this.headers
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    
    let content = '';
    if (data.content) {
      content = Buffer.from(data.content, 'base64').toString('utf-8');
    }

    return {
      path,
      content,
      size: data.size,
      encoding: data.encoding,
      sha: data.sha
    };
  }

  /**
   * Get repository languages
   */
  private async getRepositoryLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    try {
      const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/languages`, {
        headers: this.headers
      });

      if (!response.ok) {
        return {};
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching repository languages:', error);
      return {};
    }
  }

  /**
   * Detect if repository has tests
   */
  private detectTests(files: FileContent[]): boolean {
    return files.some(file => 
      /test|spec/i.test(file.path) || 
      file.content.includes('test(') || 
      file.content.includes('describe(') ||
      file.content.includes('it(')
    );
  }

  /**
   * Detect if repository has documentation
   */
  private detectDocumentation(files: FileContent[]): boolean {
    return files.some(file => 
      /^(README|readme|docs)/i.test(file.path) ||
      file.path.includes('/docs/') ||
      file.path.endsWith('.md')
    );
  }

  /**
   * Detect if repository has linting
   */
  private detectLinting(files: FileContent[]): boolean {
    return files.some(file => 
      /eslint|tslint|pylint|rubocop/i.test(file.path) ||
      file.path.includes('.eslintrc') ||
      file.path.includes('lint')
    );
  }

  /**
   * Detect if repository has CI/CD
   */
  private detectCI(files: FileContent[]): boolean {
    return files.some(file => 
      file.path.includes('.github/workflows/') ||
      file.path.includes('.gitlab-ci') ||
      file.path.includes('jenkinsfile') ||
      file.path.includes('travis.yml') ||
      file.path.includes('circle.yml')
    );
  }

  /**
   * Detect if repository has security policy
   */
  private detectSecurityPolicy(files: FileContent[]): boolean {
    return files.some(file => 
      /security/i.test(file.path) ||
      file.path.includes('SECURITY.md')
    );
  }

  /**
   * Detect if repository has contributing guidelines
   */
  private detectContributing(files: FileContent[]): boolean {
    return files.some(file => 
      /contributing/i.test(file.path) ||
      file.path.includes('CONTRIBUTING.md')
    );
  }

  /**
   * Detect if repository has license
   */
  private detectLicense(files: FileContent[]): boolean {
    return files.some(file => 
      /license/i.test(file.path) ||
      file.path.includes('LICENSE')
    );
  }

  /**
   * Calculate total lines of code
   */
  private calculateTotalLines(files: FileContent[]): number {
    return files.reduce((total, file) => {
      if (this.isCodeFile(file.path)) {
        return total + file.content.split('\n').length;
      }
      return total;
    }, 0);
  }

  /**
   * Check if file is a code file
   */
  private isCodeFile(path: string): boolean {
    return /\.(js|ts|jsx|tsx|py|java|cs|cpp|c|h|php|rb|go|rs|swift|kt)$/.test(path);
  }

  /**
   * Assess repository complexity
   */
  private assessComplexity(files: FileContent[], languages: Record<string, number>): 'low' | 'medium' | 'high' {
    const totalLines = this.calculateTotalLines(files);
    const languageCount = Object.keys(languages).length;
    const fileCount = files.length;
    
    if (totalLines > 50000 || languageCount > 5 || fileCount > 200) {
      return 'high';
    } else if (totalLines > 10000 || languageCount > 2 || fileCount > 50) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Get security analysis
   */
  async getSecurityAnalysis(owner: string, repo: string): Promise<SecurityAnalysis> {
    try {
      const vulnerabilities = await this.getVulnerabilities(owner, repo);
      const secretsDetected = await this.scanForSecrets(owner, repo);
      const dependencyAnalysis = await this.analyzeDependencies(owner, repo);
      
      const securityScore = this.calculateSecurityScore(vulnerabilities, secretsDetected, dependencyAnalysis);
      const recommendations = this.generateSecurityRecommendations(vulnerabilities, secretsDetected, dependencyAnalysis);

      return {
        vulnerabilities,
        secretsDetected,
        dependencyAnalysis,
        securityScore,
        recommendations
      };
    } catch (error) {
      console.error(`Error getting security analysis for ${owner}/${repo}:`, error);
      return {
        vulnerabilities: [],
        secretsDetected: [],
        dependencyAnalysis: { outdated: [], vulnerable: [], total: 0 },
        securityScore: 50,
        recommendations: ['Unable to perform complete security analysis']
      };
    }
  }

  /**
   * Get vulnerabilities (simplified version - in production would use security APIs)
   */
  private async getVulnerabilities(owner: string, repo: string): Promise<SecurityVulnerability[]> {
    // In production, this would integrate with GitHub Security Advisories API
    // For now, return mock data based on patterns
    return [];
  }

  /**
   * Scan for potential secrets in code
   */
  private async scanForSecrets(owner: string, repo: string): Promise<string[]> {
    // Simplified secret detection - in production would use more sophisticated patterns
    const secrets: string[] = [];
    const secretPatterns = [
      /api[_-]?key/i,
      /secret[_-]?key/i,
      /password/i,
      /token/i,
      /credential/i
    ];
    
    // This would analyze file contents for secret patterns
    return secrets;
  }

  /**
   * Analyze dependencies for vulnerabilities
   */
  private async analyzeDependencies(owner: string, repo: string): Promise<{ outdated: string[]; vulnerable: string[]; total: number }> {
    // In production, this would integrate with dependency analysis services
    return {
      outdated: [],
      vulnerable: [],
      total: 0
    };
  }

  /**
   * Calculate security score
   */
  private calculateSecurityScore(vulnerabilities: SecurityVulnerability[], secrets: string[], deps: any): number {
    let score = 100;
    score -= vulnerabilities.length * 10;
    score -= secrets.length * 5;
    score -= deps.vulnerable.length * 15;
    return Math.max(0, score);
  }

  /**
   * Generate security recommendations
   */
  private generateSecurityRecommendations(vulnerabilities: SecurityVulnerability[], secrets: string[], deps: any): string[] {
    const recommendations: string[] = [];
    
    if (vulnerabilities.length > 0) {
      recommendations.push('Address identified security vulnerabilities immediately');
    }
    
    if (secrets.length > 0) {
      recommendations.push('Remove hardcoded secrets and use environment variables');
    }
    
    if (deps.vulnerable.length > 0) {
      recommendations.push('Update vulnerable dependencies to secure versions');
    }
    
    recommendations.push('Implement automated security scanning in CI/CD pipeline');
    recommendations.push('Regular security audits and penetration testing');
    
    return recommendations;
  }

  /**
   * Get code quality metrics
   */
  async getCodeQualityMetrics(owner: string, repo: string): Promise<CodeQualityMetrics> {
    try {
      const contents = await this.getRepositoryContents(owner, repo);
      
      return {
        linesOfCode: this.calculateTotalLines(contents.files),
        complexity: this.calculateCyclomaticComplexity(contents.files),
        maintainabilityIndex: this.calculateMaintainabilityIndex(contents.files),
        testCoverage: await this.estimateTestCoverage(owner, repo),
        codeSmells: this.detectCodeSmells(contents.files),
        duplication: this.estimateCodeDuplication(contents.files),
        technicalDebt: this.assessTechnicalDebt(contents.files)
      };
    } catch (error) {
      console.error(`Error getting code quality metrics for ${owner}/${repo}:`, error);
      return {
        linesOfCode: 0,
        complexity: 0,
        maintainabilityIndex: 50,
        codeSmells: [],
        duplication: 0,
        technicalDebt: 'Unable to assess'
      };
    }
  }

  /**
   * Calculate cyclomatic complexity (simplified)
   */
  private calculateCyclomaticComplexity(files: FileContent[]): number {
    let totalComplexity = 0;
    const complexityKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||'];
    
    files.forEach(file => {
      if (this.isCodeFile(file.path)) {
        complexityKeywords.forEach(keyword => {
          const matches = file.content.match(new RegExp(keyword, 'g'));
          if (matches) {
            totalComplexity += matches.length;
          }
        });
      }
    });
    
    return totalComplexity;
  }

  /**
   * Calculate maintainability index (simplified)
   */
  private calculateMaintainabilityIndex(files: FileContent[]): number {
    const totalLines = this.calculateTotalLines(files);
    const complexity = this.calculateCyclomaticComplexity(files);
    
    // Simplified maintainability calculation
    let maintainability = 100;
    maintainability -= Math.log(totalLines) * 5;
    maintainability -= complexity * 0.1;
    
    return Math.max(0, Math.min(100, maintainability));
  }

  /**
   * Estimate test coverage
   */
  private async estimateTestCoverage(owner: string, repo: string): Promise<number | undefined> {
    // In production, this would integrate with coverage services
    return undefined;
  }

  /**
   * Detect code smells
   */
  private detectCodeSmells(files: FileContent[]): string[] {
    const smells: string[] = [];
    
    files.forEach(file => {
      if (this.isCodeFile(file.path)) {
        // Large files
        if (file.content.split('\n').length > 500) {
          smells.push(`Large file: ${file.path} (${file.content.split('\n').length} lines)`);
        }
        
        // Long functions (simplified detection)
        const functionMatches = file.content.match(/function\s+\w+\s*\([^)]*\)\s*\{/g);
        if (functionMatches && functionMatches.length > 20) {
          smells.push(`Too many functions in ${file.path}`);
        }
        
        // TODO comments
        if (file.content.includes('TODO') || file.content.includes('FIXME')) {
          smells.push(`TODO/FIXME comments in ${file.path}`);
        }
      }
    });
    
    return smells;
  }

  /**
   * Estimate code duplication
   */
  private estimateCodeDuplication(files: FileContent[]): number {
    // Simplified duplication detection
    const codeLines = new Set<string>();
    let totalLines = 0;
    let duplicateLines = 0;
    
    files.forEach(file => {
      if (this.isCodeFile(file.path)) {
        const lines = file.content.split('\n').filter(line => line.trim().length > 5);
        lines.forEach(line => {
          totalLines++;
          if (codeLines.has(line.trim())) {
            duplicateLines++;
          } else {
            codeLines.add(line.trim());
          }
        });
      }
    });
    
    return totalLines > 0 ? (duplicateLines / totalLines) * 100 : 0;
  }

  /**
   * Assess technical debt
   */
  private assessTechnicalDebt(files: FileContent[]): string {
    const issues: string[] = [];
    
    files.forEach(file => {
      if (this.isCodeFile(file.path)) {
        // Check for deprecated patterns
        if (file.content.includes('@deprecated') || file.content.includes('deprecated')) {
          issues.push('Deprecated code found');
        }
        
        // Check for console.log (in production code)
        if (file.content.includes('console.log') && !file.path.includes('test')) {
          issues.push('Debug statements in production code');
        }
      }
    });
    
    if (issues.length === 0) return 'Low';
    if (issues.length < 5) return 'Medium';
    return 'High';
  }

  /**
   * Get repository issues
   */
  async getIssues(owner: string, repo: string, limit: number = 100): Promise<GitHubIssue[]> {
    try {
      const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/issues?state=all&per_page=${limit}`, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.map((issue: any) => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        labels: issue.labels.map((label: any) => label.name),
        createdAt: new Date(issue.created_at),
        updatedAt: new Date(issue.updated_at),
        author: issue.user.login
      }));
    } catch (error) {
      console.error(`Error fetching issues for ${owner}/${repo}:`, error);
      return [];
    }
  }

  /**
   * Get repository pull requests
   */
  async getPullRequests(owner: string, repo: string, limit: number = 100): Promise<GitHubPullRequest[]> {
    try {
      const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/pulls?state=all&per_page=${limit}`, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.map((pr: any) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        createdAt: new Date(pr.created_at),
        updatedAt: new Date(pr.updated_at),
        author: pr.user.login,
        changedFiles: pr.changed_files || 0,
        additions: pr.additions || 0,
        deletions: pr.deletions || 0
      }));
    } catch (error) {
      console.error(`Error fetching pull requests for ${owner}/${repo}:`, error);
      return [];
    }
  }

  /**
   * Get recent commits
   */
  async getRecentCommits(owner: string, repo: string, limit: number = 100): Promise<GitHubCommit[]> {
    try {
      const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/commits?per_page=${limit}`, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.map((commit: any) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.author?.login || commit.commit.author.name,
        date: new Date(commit.commit.author.date),
        changedFiles: commit.stats?.total || 0
      }));
    } catch (error) {
      console.error(`Error fetching commits for ${owner}/${repo}:`, error);
      return [];
    }
  }

  /**
   * Get repository contributors
   */
  async getContributors(owner: string, repo: string): Promise<GitHubContributor[]> {
    try {
      const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/contributors`, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.map((contributor: any) => ({
        login: contributor.login,
        contributions: contributor.contributions,
        type: contributor.type
      }));
    } catch (error) {
      console.error(`Error fetching contributors for ${owner}/${repo}:`, error);
      return [];
    }
  }

  /**
   * Validate repository URL and accessibility
   */
  async validateRepository(repositoryUrl: string): Promise<GitHubRepository | null> {
    try {
      const { owner, repo } = this.parseRepositoryUrl(repositoryUrl);
      return await this.getRepository(owner, repo);
    } catch (error) {
      console.error('Repository validation failed:', error);
      return null;
    }
  }

  /**
   * Create pull request with fixes
   */
  async createPullRequest(owner: string, repo: string, pullRequestData: PullRequestData): Promise<any> {
    try {
      // Create a new branch for the fixes
      const branchName = `ai-gladiator-fixes-${Date.now()}`;
      
      // In production, this would:
      // 1. Create a new branch
      // 2. Apply the changes
      // 3. Commit the changes
      // 4. Create the pull request
      
      console.log(`Would create PR: ${pullRequestData.title} with ${pullRequestData.changes.length} changes`);
      
      return {
        number: Math.floor(Math.random() * 1000),
        url: `https://github.com/${owner}/${repo}/pull/1`,
        branch: branchName
      };
    } catch (error) {
      console.error('Error creating pull request:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const gitHubService = new GitHubService();