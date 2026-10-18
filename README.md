# PetPal

PetPal is a pet care management platform where users can register their pets and manage their care-related information through the application.

## Author

| Roll No. | Name | GitHub username |
|---|---|---|
| 24ESKCS074 | Atulya Tiwari | atulyatiwari2006 |

## About

PetPal is a pet care management platform designed to help users manage information related to their pets. The application provides features such as pet registration, pet care information, medicine management, and a gallery.

## Tech stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js
- Database: Not used

## Project Structure

- `pages/atulya/` - Medicine management pages
- `pages/bhumika/` - Pet care pages
- `pages/Chaitanya/` - Pet registration, gallery and related application files
- `tests/` - Automated tests
- `scripts/` - CI hygiene scripts

## DevOps

This repository is maintained as part of the DevOps Practices and Principles course.

The project demonstrates:

- Version control with Git and GitHub
- Branching and Pull Requests
- Continuous Integration with GitHub Actions
- Automated testing
- Jenkins pipeline
- Containerization
- Deployment and monitoring
- Kubernetes

## Repository

Organization: `skit-devops-2026`

Repository: `devops-24ESKCS074`

## Running locally

```bash
node pages/Chaitanya/server.js

## Live Deployment

PetPal is deployed on Render and can be accessed here:

- **Live Website:** https://petpal-s0o0.onrender.com
- **Health Check:** https://petpal-s0o0.onrender.com/health
- **Prometheus Metrics:** https://petpal-s0o0.onrender.com/metrics

## Kubernetes Deployment

Kubernetes deployment files are available in the `k8s/` directory.

- `k8s/deployment.yaml` — Deploys two PetPal replicas.
- `k8s/service.yaml` — Exposes the application through a Kubernetes Service.

To check the deployment status:

```bash
kubectl get pods
kubectl get services
```

## Monitoring

- Prometheus configuration: `monitoring/prometheus.yml`
- Grafana dashboard: `monitoring/petpal-dashboard.json`
- Dashboard screenshot: `monitoring/dashboard.png`
