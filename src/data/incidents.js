/**
 * DEVOPS ARENA — First-Year Friendly Incident Bank
 * Exactly 15 original, concise incident scenarios.
 * Designed for quick comprehension and fast decision-making during 15-second rounds.
 */

export const INCIDENT_BANK = [
  {
    id: 'INC-01',
    category: 'Git & GitHub',
    severity: 'CRITICAL',
    title: 'Exposed Cloud API Key',
    description: 'An AWS access key was accidentally committed to a public GitHub repository.',
    clue: 'commit 4f1a · + aws_secret_key = "AKIA..."',
    leftAction: {
      title: 'Revoke & Rotate Key',
      description: 'Invalidate key immediately in IAM and generate a new one.',
      icon: '🛡️'
    },
    rightAction: {
      title: 'Delete Repo & Hope',
      description: 'Delete the GitHub repo and hope nobody saved the secret.',
      icon: '🙈'
    },
    correctAction: 'left',
    explanation: 'Revoking the key immediately stops unauthorized cloud access even if cloned.',
    impact: { availability: 0, integrity: +10, security: +25, stability: 0 }
  },
  {
    id: 'INC-02',
    category: 'HTTP & Networking',
    severity: 'HIGH',
    title: 'Website Down (500 Error)',
    description: 'The production website is returning HTTP 500 Internal Server Error to all visitors.',
    clue: 'HTTP/1.1 500 Internal Server Error',
    leftAction: {
      title: 'Inspect Application Logs',
      description: 'Check error logs to identify the exact runtime failure.',
      icon: '🔍'
    },
    rightAction: {
      title: 'Delete Database',
      description: 'Drop production database tables and restart from scratch.',
      icon: '💥'
    },
    correctAction: 'left',
    explanation: 'Application logs reveal the source of errors without destroying user data.',
    impact: { availability: +20, integrity: +10, security: 0, stability: +15 }
  },
  {
    id: 'INC-03',
    category: 'Deployment Failures',
    severity: 'CRITICAL',
    title: 'Broken Production Release',
    description: 'A new release broke checkout and customers cannot complete any purchases.',
    clue: 'Checkout service crashing on boot (v2.4.1)',
    leftAction: {
      title: 'Ignore & Wait for Fix',
      description: 'Leave the broken release online while developers write code.',
      icon: '⏳'
    },
    rightAction: {
      title: 'Instant Rollback',
      description: 'Roll back immediately to the last known-good stable release.',
      icon: '⏪'
    },
    correctAction: 'right',
    explanation: 'Rolling back immediately restores customer revenue while engineers debug.',
    impact: { availability: +25, integrity: +10, security: 0, stability: +20 }
  },
  {
    id: 'INC-04',
    category: 'Linux Fundamentals',
    severity: 'HIGH',
    title: 'Disk Storage 100% Full',
    description: 'The server stopped writing logs and crashed because root disk has 0 MB free.',
    clue: '/dev/sda1: 50GB / 50GB (100% Full)',
    leftAction: {
      title: 'Clean Logs & Temp Files',
      description: 'Delete old rotated logs and clear /tmp directory safely.',
      icon: '🧹'
    },
    rightAction: {
      title: 'Run rm -rf /* as Root',
      description: 'Run recursive forced wipe on the entire root file system.',
      icon: '💣'
    },
    correctAction: 'left',
    explanation: 'Clearing expired logs recovers disk space without deleting critical OS binaries.',
    impact: { availability: +20, integrity: +15, security: 0, stability: +15 }
  },
  {
    id: 'INC-05',
    category: 'Docker Basics',
    severity: 'MEDIUM',
    title: 'Container Exits on Startup',
    description: 'A newly launched Docker container stops 1 second after starting up.',
    clue: 'docker ps | STATUS: Exited (0) 2s ago',
    leftAction: {
      title: 'Inspect docker logs',
      description: 'Run docker logs to see why the main container process exited.',
      icon: '📋'
    },
    rightAction: {
      title: 'Reinstall Docker Daemon',
      description: 'Uninstall and reinstall Docker on the entire server.',
      icon: '🔄'
    },
    correctAction: 'left',
    explanation: 'docker logs shows the exit message or missing environment variable directly.',
    impact: { availability: +15, integrity: 0, security: 0, stability: +15 }
  },
  {
    id: 'INC-06',
    category: 'CI/CD Pipelines',
    severity: 'HIGH',
    title: 'CI Unit Tests Failed',
    description: 'Automated test suite failed in CI pipeline on a pull request targeting main.',
    clue: 'FAIL auth.test.js: 2 tests failed, 40 passed',
    leftAction: {
      title: 'Comment Out Failing Tests',
      description: 'Delete test checks so the pipeline turns green and auto-deploys.',
      icon: '🙈'
    },
    rightAction: {
      title: 'Fix Bug Before Merging',
      description: 'Investigate the failed assertion and fix the broken code logic.',
      icon: '🔧'
    },
    correctAction: 'right',
    explanation: 'Fixing the bug preserves system quality instead of shipping flaws to users.',
    impact: { availability: +10, integrity: +20, security: +15, stability: +20 }
  },
  {
    id: 'INC-07',
    category: 'Basic Security',
    severity: 'CRITICAL',
    title: 'Plaintext Password in Code',
    description: 'Production database password was found hardcoded inside client-side JavaScript.',
    clue: 'const dbPass = "MasterSecretPassword2026!";',
    leftAction: {
      title: 'Move to Environment Variable',
      description: 'Inject secret on the backend server via environment variables.',
      icon: '🔐'
    },
    rightAction: {
      title: 'Base64 Encode in Frontend',
      description: 'Encode the string in base64 so humans cannot read it at glance.',
      icon: '🔤'
    },
    correctAction: 'left',
    explanation: 'Environment variables keep credentials strictly on the secure backend server.',
    impact: { availability: 0, integrity: +15, security: +30, stability: +10 }
  },
  {
    id: 'INC-08',
    category: 'HTTP & Networking',
    severity: 'HIGH',
    title: 'SSL Certificate Expired',
    description: 'Browsers warn users "Connection Not Private" because HTTPS certificate lapsed.',
    clue: 'NET::ERR_CERT_DATE_INVALID',
    leftAction: {
      title: 'Renew SSL Certificate',
      description: 'Trigger Let\'s Encrypt / Certbot automated certificate renewal.',
      icon: '🔒'
    },
    rightAction: {
      title: 'Tell Users to Click Bypass',
      description: 'Advise users to ignore browser red security warnings.',
      icon: '📢'
    },
    correctAction: 'left',
    explanation: 'Renewing the certificate restores encryption and prevents browser security blocks.',
    impact: { availability: +25, integrity: +10, security: +25, stability: +15 }
  },
  {
    id: 'INC-09',
    category: 'Linux Fundamentals',
    severity: 'MEDIUM',
    title: 'Web Server Service Crashed',
    description: 'Nginx web server is inactive (failed) and not answering port 80 requests.',
    clue: 'systemctl status nginx | Active: failed',
    leftAction: {
      title: 'Check Status & Restart',
      description: 'Check nginx -t for syntax errors, fix config, and restart service.',
      icon: '🩺'
    },
    rightAction: {
      title: 'Format the Hard Drive',
      description: 'Wipe the host operating system drive and start over.',
      icon: '💥'
    },
    correctAction: 'left',
    explanation: 'nginx -t validates syntax and systemctl restart restores the web daemon safely.',
    impact: { availability: +20, integrity: 0, security: 0, stability: +20 }
  },
  {
    id: 'INC-10',
    category: 'Cloud Infrastructure',
    severity: 'HIGH',
    title: 'Server CPU Spiked to 99%',
    description: 'A sudden surge of viral traffic has pushed server CPU utilization to 99%.',
    clue: 'CPU Alert: 99.4% load across all cores',
    leftAction: {
      title: 'Shut Down the Website',
      description: 'Power off instances until user traffic naturally subsides.',
      icon: '🔌'
    },
    rightAction: {
      title: 'Autoscale Worker Nodes',
      description: 'Scale out additional cloud instances to distribute traffic load.',
      icon: '📈'
    },
    correctAction: 'right',
    explanation: 'Autoscaling adds capacity to absorb peak demand without turning off service.',
    impact: { availability: +25, integrity: 0, security: 0, stability: +20 }
  },
  {
    id: 'INC-11',
    category: 'Logs & Monitoring',
    severity: 'MEDIUM',
    title: 'Pager Storm (200 Slack Alerts)',
    description: 'A core router outage triggered 200 noisy Slack alerts across 10 channels.',
    clue: 'ALERT SPAM: 204 unread messages in #on-call',
    leftAction: {
      title: 'Triage Root Network Cause',
      description: 'Identify the primary network failure and apply alert grouping.',
      icon: '🎯'
    },
    rightAction: {
      title: 'Mute Notifications Forever',
      description: 'Turn off all monitoring notifications so nobody gets paged.',
      icon: '🔕'
    },
    correctAction: 'left',
    explanation: 'Triaging the root failure resolves the issue and stops all cascading alerts.',
    impact: { availability: +15, integrity: +5, security: 0, stability: +15 }
  },
  {
    id: 'INC-12',
    category: 'Git & GitHub',
    severity: 'MEDIUM',
    title: 'Merge Conflict in Pull Request',
    description: 'Git cannot automatically merge feature branch due to conflicting lines in code.',
    clue: 'CONFLICT (content): Merge conflict in server.js',
    leftAction: {
      title: 'Reconcile Conflict & Test',
      description: 'Resolve diff markers locally, run tests, and commit clean merge.',
      icon: '🔍'
    },
    rightAction: {
      title: 'Force Push with -f Flag',
      description: 'Force overwrite the shared branch with git push --force.',
      icon: '💥'
    },
    correctAction: 'left',
    explanation: 'Manual reconciliation prevents accidentally erasing code committed by teammates.',
    impact: { availability: 0, integrity: +15, security: 0, stability: +15 }
  },
  {
    id: 'INC-13',
    category: 'Docker Basics',
    severity: 'MEDIUM',
    title: 'Container Port Not Reachable',
    description: 'Node.js is running inside a container, but localhost:8080 gives Connection Refused.',
    clue: 'curl http://localhost:8080 -> Connection refused',
    leftAction: {
      title: 'Map Port with -p 8080:8080',
      description: 'Publish the port from host to container using the -p flag.',
      icon: '🔌'
    },
    rightAction: {
      title: 'Disable Laptop Firewall',
      description: 'Turn off all network firewall security on your personal machine.',
      icon: '🔥'
    },
    correctAction: 'left',
    explanation: 'Docker containers need explicit port mapping to bridge container and host network.',
    impact: { availability: +15, integrity: 0, security: +10, stability: +10 }
  },
  {
    id: 'INC-14',
    category: 'Cloud & Database',
    severity: 'HIGH',
    title: 'Untested Database Backup',
    description: 'Automated database backups run nightly, but no one has ever verified restoration.',
    clue: 'Audit Warning: Recovery Time Objective (RTO) unverified',
    leftAction: {
      title: 'Trust Backup File Size',
      description: 'Assume the backup works because the file is 2GB in size.',
      icon: '🤞'
    },
    rightAction: {
      title: 'Test Restore in Staging',
      description: 'Restore backup archive to isolated staging DB to verify data.',
      icon: '🧪'
    },
    correctAction: 'right',
    explanation: 'An untested backup is not a backup; test restorations prove recovery works.',
    impact: { availability: 0, integrity: +30, security: +10, stability: +20 }
  },
  {
    id: 'INC-15',
    category: 'Basic Security',
    severity: 'CRITICAL',
    title: 'Default Admin Password in Prod',
    description: 'The production cloud gateway is still configured with factory password "admin123".',
    clue: 'Security Scan: Default credentials enabled on port 443',
    leftAction: {
      title: 'Set Strong Unique Password',
      description: 'Update to random 20-character password stored in password manager.',
      icon: '🔑'
    },
    rightAction: {
      title: 'Keep Default for Convenience',
      description: 'Keep admin123 so the entire club remembers the login password.',
      icon: '🔓'
    },
    correctAction: 'left',
    explanation: 'Default credentials are the #1 target of automated internet credential bots.',
    impact: { availability: 0, integrity: +10, security: +30, stability: +10 }
  }
];
