# 🚀 Aarivox Smart Planner Deployment Guide

This guide details the infrastructure, configurations, and pipeline setup for building, running, and deploying the Aarivox Smart Planner application.

---

## 🛠️ Technology Stack
1. **Frontend**: Angular UI served by Nginx.    
2. **Backend**: Java 17 Spring Boot API managed by PM2.
3. **Database**: PostgreSQL (automatically configured via Spring Boot JPA).
4. **Infrastructure**: AWS EC2 (`t3.micro`) and Elastic IP provisioned via Terraform.
5. **Deployment**: Ansible playbooks triggered via GitHub Actions.

---

## ⚙️ Zero-Downtime Deployment (Blue-Green Port Swap)
To prevent the application from going down during deployments, the Ansible playbook uses a **dynamic port swap** strategy:
1. It checks if port `8080` is active.
2. If `8080` is active, it deploys the new release to port `8081`. Otherwise, it deploys to `8080`.
3. It waits for the new version to start and listen.
4. It updates the Nginx proxy routing (`proxy_pass http://127.0.0.1:<active_port>/api/`) and runs a hot-reload (`systemctl reload nginx`).
5. Once Nginx is reloaded with zero downtime, it stops the old backend version.

---

## 🔐 GitHub Secrets Configuration
You must configure the following Secrets in your GitHub Repository under **Settings** -> **Secrets and variables** -> **Actions**:

| Secret Name | Value Description | Example |
| :--- | :--- | :--- |
| `EC2_HOST` | The Elastic IP of your UAT server (Output from Terraform) | `13.62.111.155` |
| `EC2_PEM` | The full private key file content (`.pem`) used to SSH into the server | `-----BEGIN RSA PRIVATE KEY----- ...` |
| `DB_PASSWORD` | The password for the `postgres` user | `root` |
| `AWS_S3_ACCESS_KEY` | AWS S3 access key | `<YOUR_AWS_S3_ACCESS_KEY>` |
| `AWS_S3_SECRET_KEY` | AWS S3 secret key | `<YOUR_AWS_S3_SECRET_KEY>` |

---

## 🚀 How to Run Locally

### 1. Run PostgreSQL Database
Ensure PostgreSQL is running locally with:
- Port: `5432`
- Username: `postgres`
- Password: `root`
- Database Name: `aarivox`

### 2. Run the Java Backend
```bash
cd aarivox-smartplanner-backend
./gradlew bootRun
```

### 3. Run the Angular Admin Frontend
```bash
cd aarivox-smartplanner-admin-application
npm install
npm run start
```
Access the application at `http://localhost:4200/`.

---

## ☁️ How to Deploy

### 1. Provision Infrastructure (Terraform)
We have initialized and applied the Terraform configuration. If you need to manage it:
```bash
cd infrastructure/uat
# Set AWS credentials in your environment
$env:AWS_ACCESS_KEY_ID="<YOUR_AWS_ACCESS_KEY_ID>"
$env:AWS_SECRET_ACCESS_KEY="<YOUR_AWS_SECRET_ACCESS_KEY>"

terraform plan -out=tfplan
terraform apply "tfplan"
```

### 2. Continuous Integration & Deployment (GitHub Actions)
* The deployment runs automatically when you push/merge commits into the **`master`** branch.
* It triggers the CI/CD pipeline defined in `.github/workflows/deploy.yml` which builds the backend, compiles the Angular frontend, prepares SSH credentials, and executes the Ansible playbook on the EC2 instance.
