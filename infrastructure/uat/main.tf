terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "eu-north-1"
}

variable "env" { default = "uat" }
variable "key_name" { default = "cricket-canvas-key-pair" }
variable "instance_state" {
  description = "The state of the EC2 instance (running or stopped)"
  type        = string
  default     = "running"
}

# Data source to fetch the latest Ubuntu AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Security Group
resource "aws_security_group" "web_sg" {
  name        = "aarivox-web-sg-${var.env}"
  description = "Allow Web and SSH traffic"

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "Aarivox-${var.env}-SG", Env = var.env }
}

# EC2 Instance (t3.micro)
resource "aws_instance" "app_server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"
  key_name      = var.key_name

  vpc_security_group_ids = [aws_security_group.web_sg.id]

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = { Name = "Aarivox-${var.env}-Server", Env = var.env }
}

# Elastic IP
resource "aws_eip" "app_eip" {
  domain = "vpc"
  tags   = { Name = "Aarivox-${var.env}-EIP", Env = var.env }
}

# Associate EIP with EC2
resource "aws_eip_association" "eip_assoc" {
  instance_id   = aws_instance.app_server.id
  allocation_id = aws_eip.app_eip.id
}

# Instance power state management
resource "aws_ec2_instance_state" "app_server_state" {
  instance_id = aws_instance.app_server.id
  state       = var.instance_state
}

output "server_ip" { value = aws_eip.app_eip.public_ip }
