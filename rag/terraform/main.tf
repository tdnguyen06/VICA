terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Lấy thông tin Default VPC và Subnet công khai để không phải tạo mới
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Security Group: Chỉ mở SSH (22) và cổng ứng dụng Spring Boot (8080)
resource "aws_security_group" "rag_sg" {
  name        = "rag-conditional-sg"
  description = "Allow SSH and Spring Boot app port"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH from my IP only (recommended)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip_cidr] # Ví dụ: "203.0.113.5/32"
  }

  ingress {
    description = "Spring Boot Application"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Có thể giới hạn IP nếu chỉ dùng nội bộ
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "rag-conditional-sg"
  }
}

# Key Pair: Sử dụng public key có sẵn trên máy bạn (ví dụ: ~/.ssh/id_rsa.pub)
resource "aws_key_pair" "rag_key" {
  key_name   = "rag-conditional-key"
  public_key = file(pathexpand(var.ssh_public_key_path))
}

# EC2 Instance
resource "aws_instance" "rag_server" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  subnet_id              = data.aws_subnets.default.ids[0]
  vpc_security_group_ids = [aws_security_group.rag_sg.id]
  key_name               = aws_key_pair.rag_key.key_name

  # Không gán public IP động, vì đã có Elastic IP
  associate_public_ip_address = false

  root_block_device {
    volume_size = 60 # GB, tăng lên nếu cần chứa Docker images (Ollama, PGVector)
    volume_type = "gp3"
  }

  tags = {
    Name = "rag-conditional-server"
  }
}

# Elastic IP: Tồn tại độc lập với vòng đời stop/start của EC2
resource "aws_eip" "rag_eip" {
  domain = "vpc"

  # RẤT QUAN TRỌNG: Ngăn Terraform vô tình release IP này
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name = "rag-conditional-eip"
  }
}

# Gắn Elastic IP vào EC2
resource "aws_eip_association" "rag_eip_assoc" {
  instance_id   = aws_instance.rag_server.id
  allocation_id = aws_eip.rag_eip.id
}

# Output để bạn biết IP cố định sau khi apply
output "elastic_ip" {
  description = "Địa chỉ IP cố định của máy chủ RAG"
  value       = aws_eip.rag_eip.public_ip
}

output "ssh_command" {
  description = "Lệnh SSH để kết nối vào máy"
  value       = "ssh -i <đường_dẫn_private_key> ec2-user@${aws_eip.rag_eip.public_ip}"
}