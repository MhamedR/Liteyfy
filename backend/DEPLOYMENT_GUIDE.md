# Liteyfy Deployment & Monitoring Guide

Complete guide for deploying and monitoring the Liteyfy backend microservices in production.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Monitoring Setup](#monitoring-setup)
- [CI/CD Pipelines](#cicd-pipelines)
- [Scaling Strategies](#scaling-strategies)
- [Failover & High Availability](#failover--high-availability)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

### Required Tools

- **Docker** 24+ and **Docker Compose** 2+
- **Kubernetes** 1.28+ (for K8s deployment)
- **kubectl** (for K8s management)
- **Helm** 3+ (optional, for easier K8s deployments)
- **Node.js** 20 LTS (for local development)

### Required Secrets

Generate VAPID keys for Web Push:

```bash
npx web-push generate-vapid-keys
```

Save the output:
```
Public Key: YOUR_PUBLIC_KEY
Private Key: YOUR_PRIVATE_KEY
```

---

## 🐳 Docker Deployment

### 1. Development Environment

```bash
cd backend

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services available at:
- User Subscription: http://localhost:3001
- Event Ingestion: http://localhost:3002
- Notification Delivery: http://localhost:3003
- Analytics: http://localhost:3004

### 2. Production Environment

Create `.env` file:

```bash
# backend/.env
VERSION=1.0.0
MONGO_ROOT_USERNAME=liteyfy
MONGO_ROOT_PASSWORD=CHANGE_THIS_IN_PRODUCTION
VAPID_PUBLIC_KEY=YOUR_PUBLIC_KEY
VAPID_PRIVATE_KEY=YOUR_PRIVATE_KEY
VAPID_SUBJECT=mailto:admin@liteyfy.be
GRAFANA_ADMIN_PASSWORD=CHANGE_THIS_IN_PRODUCTION
```

Start production stack:

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Setup Kafka topics
cd kafka-setup
npm install
npm run setup

# Verify services
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
```

### 3. Monitoring Stack

Access monitoring tools:

- **Grafana**: http://localhost:3000 (admin/YOUR_PASSWORD)
- **Prometheus**: http://localhost:9090
- **cAdvisor**: http://localhost:8080

---

## ☸️ Kubernetes Deployment

### 1. Prerequisites

Ensure you have:
- Kubernetes cluster (GKE, EKS, AKS, or self-hosted)
- kubectl configured
- Container registry (Docker Hub, GCR, ECR, etc.)

### 2. Build and Push Images

```bash
# Set your registry
export REGISTRY=your-registry.com/liteyfy

# Build all images
cd backend
docker-compose -f docker-compose.prod.yml build

# Tag and push
docker tag liteyfy/user-subscription-service:latest $REGISTRY/user-subscription-service:v1.0.0
docker push $REGISTRY/user-subscription-service:v1.0.0

# Repeat for all services
```

### 3. Prepare Secrets

```bash
# Create base64-encoded secrets
echo -n 'your-password' | base64

# Edit secrets.yaml with your values
vi deployment/kubernetes/secrets.yaml
```

### 4. Deploy to Kubernetes

```bash
cd deployment/kubernetes

# Create namespace
kubectl apply -f namespace.yaml

# Create secrets and configmaps
kubectl apply -f secrets.yaml
kubectl apply -f configmap.yaml

# Deploy services
kubectl apply -f user-subscription-service.yaml
kubectl apply -f event-ingestion-service.yaml
kubectl apply -f notification-delivery-service.yaml
kubectl apply -f analytics-service.yaml

# Verify deployment
kubectl get pods -n liteyfy
kubectl get services -n liteyfy
```

### 5. Configure Ingress (optional)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: liteyfy-ingress
  namespace: liteyfy
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.liteyfy.be
    secretName: liteyfy-tls
  rules:
  - host: api.liteyfy.be
    http:
      paths:
      - path: /subscriptions
        pathType: Prefix
        backend:
          service:
            name: user-subscription-service
            port:
              number: 3001
      - path: /analytics
        pathType: Prefix
        backend:
          service:
            name: analytics-service
            port:
              number: 3004
```

---

## 📊 Monitoring Setup

### Prometheus Configuration

Already configured in `deployment/monitoring/prometheus.yml`

**Key Metrics Tracked:**

- **Service Metrics**: Request rate, error rate, latency
- **Kafka Metrics**: Consumer lag, partition status
- **Database Metrics**: Connections, query performance
- **System Metrics**: CPU, memory, disk usage

### Grafana Dashboards

1. Access Grafana: http://localhost:3000
2. Login with admin credentials
3. Navigate to Dashboards → Liteyfy

**Available Dashboards:**

- **Services Overview**: Health status of all microservices
- **Kafka Monitoring**: Topics, consumer lag, throughput
- **Database Performance**: MongoDB and Redis metrics
- **System Resources**: CPU, memory, disk, network

### Alerting

Alerts configured in `deployment/monitoring/alerts.yml`:

- Service down (> 1 minute)
- High error rate (> 5%)
- High response time (> 1 second)
- High consumer lag (> 1000 messages)
- MongoDB/Redis issues
- System resource alerts

### Custom Metrics

Add metrics to your services:

```javascript
import { Counter, Histogram, Gauge } from 'prom-client';

const httpRequests = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'status', 'path']
});

const httpDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'path']
});

// In your Express app
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    httpRequests.inc({ method: req.method, status: res.statusCode, path: req.path });
    httpDuration.observe({ method: req.method, path: req.path }, (Date.now() - start) / 1000);
  });
  next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

## 🔄 CI/CD Pipelines

### GitHub Actions

Configured in `.github/workflows/ci-cd.yml`

**Pipeline Stages:**

1. **Test**: Run tests for all services
2. **Build**: Build and push Docker images to GHCR
3. **Deploy Staging**: Auto-deploy to staging on `develop` branch
4. **Deploy Production**: Manual deployment on releases
5. **Security Scan**: Trivy vulnerability scanning

**Required Secrets:**

```bash
# GitHub Repository Secrets
GITHUB_TOKEN                 # Auto-provided
KUBE_CONFIG_STAGING          # Base64-encoded kubeconfig for staging
KUBE_CONFIG_PROD            # Base64-encoded kubeconfig for production
SLACK_WEBHOOK               # For deployment notifications
```

**Trigger Deployment:**

```bash
# Staging (automatic on push to develop)
git push origin develop

# Production (create release)
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
gh release create v1.0.0
```

### GitLab CI

Configured in `.gitlab-ci.yml`

**Pipeline Stages:**

1. **Test**: Run tests in parallel for all services
2. **Build**: Build Docker images and push to GitLab Registry
3. **Deploy Staging**: Auto-deploy to staging
4. **Deploy Production**: Manual deployment with approval

**Required Variables:**

```bash
# GitLab CI/CD Variables
CI_REGISTRY_USER            # Auto-provided
CI_REGISTRY_PASSWORD        # Auto-provided
KUBE_CONFIG_STAGING         # Base64-encoded kubeconfig
KUBE_CONFIG_PROD           # Base64-encoded kubeconfig
```

---

## 📈 Scaling Strategies

### Horizontal Pod Autoscaling (HPA)

Already configured in K8s manifests:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-subscription-service-hpa
spec:
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        averageUtilization: 80
```

**Scaling Behavior:**

- **Scale Up**: Add 100% or 2 pods (whichever is greater) every 30s
- **Scale Down**: Remove 50% of pods every 60s (stabilization: 5 minutes)
- **Triggers**: CPU > 70% OR Memory > 80%

### Vertical Pod Autoscaling (VPA)

For long-running services that need more resources:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: user-subscription-service-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-subscription-service
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: user-subscription-service
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 2000m
        memory: 1Gi
```

### Kafka Consumer Scaling

**Scale consumers based on lag:**

```bash
# Monitor lag
kubectl get hpa -n liteyfy -w

# If lag is consistently high, manually scale
kubectl scale deployment notification-delivery-service --replicas=5 -n liteyfy
```

**Auto-scale with KEDA:**

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: notification-delivery-scaler
spec:
  scaleTargetRef:
    name: notification-delivery-service
  minReplicaCount: 2
  maxReplicaCount: 10
  triggers:
  - type: kafka
    metadata:
      bootstrapServers: kafka:9092
      consumerGroup: notification-delivery-group
      topic: train-events,weather-events,stib-events
      lagThreshold: '500'
```

### Database Scaling

**MongoDB Replica Set:**

```yaml
apiVersion: mongodbcommunity.mongodb.com/v1
kind: MongoDBCommunity
metadata:
  name: liteyfy-mongodb
spec:
  members: 3
  type: ReplicaSet
  version: "7.0.0"
  security:
    authentication:
      modes: ["SCRAM"]
  users:
    - name: liteyfy
      db: admin
      passwordSecretRef:
        name: liteyfy-mongodb-password
      roles:
        - name: readWrite
          db: liteyfy
      scramCredentialsSecretName: liteyfy-scram
```

**Redis Cluster:**

```yaml
apiVersion: redis.redis.opstreelabs.in/v1beta1
kind: RedisCluster
metadata:
  name: liteyfy-redis
spec:
  clusterSize: 3
  clusterVersion: v7
  persistenceEnabled: true
  redisExporter:
    enabled: true
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi
```

---

## 🛡️ Failover & High Availability

### Service Level

**1. Multiple Replicas:**

```yaml
spec:
  replicas: 3  # Always run at least 3 instances
```

**2. Pod Disruption Budgets:**

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: user-subscription-service-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: user-subscription-service
```

**3. Health Checks:**

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 3
```

### Database Level

**MongoDB Replica Set:**

- **Primary**: Handles all writes
- **Secondaries** (2+): Handle reads, automatic failover
- **Arbiter** (optional): Voting member for quorum

**Automatic Failover:**

```javascript
// Connection string with replica set
mongodb://mongodb-0:27017,mongodb-1:27017,mongodb-2:27017/liteyfy?replicaSet=rs0&readPreference=secondaryPreferred
```

### Message Queue Level

**Kafka Replication:**

```bash
# Set replication factor for production
kafka-topics --create \
  --topic train-events \
  --partitions 3 \
  --replication-factor 3 \
  --config min.insync.replicas=2
```

**Consumer Groups:**

- Multiple consumers in same group = load balancing
- If one consumer fails, Kafka reassigns partitions
- Consumer heartbeat timeout: 30s

### Network Level

**1. Service Mesh (Istio):**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-subscription-service
spec:
  hosts:
  - user-subscription-service
  http:
  - route:
    - destination:
        host: user-subscription-service
        subset: v1
      weight: 100
    retries:
      attempts: 3
      perTryTimeout: 2s
    timeout: 10s
```

**2. Circuit Breaker:**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: user-subscription-service
spec:
  host: user-subscription-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        maxRequestsPerConnection: 2
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

### Disaster Recovery

**1. Backup Strategy:**

```bash
# MongoDB backup (daily)
mongodump --uri="mongodb://..." --out=/backups/$(date +%Y%m%d)

# Automated with CronJob
kubectl create cronjob mongodb-backup \
  --image=mongo:7 \
  --schedule="0 2 * * *" \
  --restart=OnFailure \
  -- mongodump --uri="mongodb://..." --out=/backups/$(date +%Y%m%d)
```

**2. Restore Procedure:**

```bash
# Restore from backup
mongorestore --uri="mongodb://..." /backups/20250101
```

**3. Multi-Region Deployment:**

```yaml
# Deploy in multiple regions
clusters:
  - region: europe-west1
    replicas: 3
  - region: us-central1
    replicas: 2
```

---

## 🔒 Security Best Practices

### 1. Secrets Management

**Use Sealed Secrets:**

```bash
# Install sealed-secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Create sealed secret
kubectl create secret generic liteyfy-secrets \
  --from-literal=MONGO_ROOT_PASSWORD=secret \
  --dry-run=client -o yaml | \
kubeseal -o yaml > sealed-secrets.yaml
```

**Or use External Secrets Operator:**

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: liteyfy-secrets
spec:
  secretStoreRef:
    name: aws-secrets-manager
  target:
    name: liteyfy-secrets
  data:
  - secretKey: MONGO_ROOT_PASSWORD
    remoteRef:
      key: liteyfy/mongo-password
```

### 2. Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: user-subscription-service-policy
spec:
  podSelector:
    matchLabels:
      app: user-subscription-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: liteyfy
    ports:
    - protocol: TCP
      port: 3001
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: mongodb
    ports:
    - protocol: TCP
      port: 27017
```

### 3. Resource Limits

Always set resource limits:

```yaml
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 512Mi
```

### 4. Security Context

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000
  capabilities:
    drop:
    - ALL
  readOnlyRootFilesystem: true
```

---

## 🐛 Troubleshooting

### Common Issues

**1. Pods Not Starting:**

```bash
# Check pod status
kubectl get pods -n liteyfy

# Describe pod
kubectl describe pod <pod-name> -n liteyfy

# Check logs
kubectl logs <pod-name> -n liteyfy

# Check events
kubectl get events -n liteyfy --sort-by='.lastTimestamp'
```

**2. High Consumer Lag:**

```bash
# Check lag
kafka-consumer-groups --bootstrap-server kafka:9092 \
  --group notification-delivery-group \
  --describe

# Scale consumers
kubectl scale deployment notification-delivery-service --replicas=5 -n liteyfy
```

**3. Database Connection Issues:**

```bash
# Test connection
kubectl run -it --rm mongo-client --image=mongo:7 --restart=Never -- \
  mongosh "mongodb://liteyfy:password@mongodb:27017/liteyfy?authSource=admin"

# Check MongoDB logs
kubectl logs mongodb-0 -n liteyfy
```

**4. Service Not Responding:**

```bash
# Check service endpoints
kubectl get endpoints -n liteyfy

# Port-forward to test locally
kubectl port-forward svc/user-subscription-service 3001:3001 -n liteyfy

# Test health endpoint
curl http://localhost:3001/health
```

### Performance Issues

**1. High Memory Usage:**

```bash
# Check resource usage
kubectl top pods -n liteyfy

# Increase memory limits
kubectl set resources deployment user-subscription-service \
  --limits=memory=1Gi -n liteyfy
```

**2. High CPU Usage:**

```bash
# Profile Node.js app
kubectl exec -it <pod-name> -n liteyfy -- \
  node --prof app.js

# Or use HPA to auto-scale
kubectl autoscale deployment user-subscription-service \
  --cpu-percent=70 --min=2 --max=10 -n liteyfy
```

---

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [Docker Documentation](https://docs.docker.com/)

---

## 🆘 Support

For issues or questions:
- Open a GitHub issue
- Contact: admin@liteyfy.be
- Slack: #liteyfy-ops

