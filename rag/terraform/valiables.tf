variable "aws_region" {
  default = "ap-southeast-1" # Ví dụ: Singapore
}

variable "instance_type" {
  default = "t3.micro" # Đủ cho Docker + Ollama (CPU) hoặc các model nhỏ
  # Nếu dùng GPU: "g4dn.xlarge" (cần cấu hình thêm cho Docker GPU)
}

variable "ami_id" {
  # Amazon Linux 2023 (ap-southeast-1). Bạn có thể tra cứu AMI mới nhất theo region.
  default = "ami-0f9f4aa7568ab927d" 
}

variable "my_ip_cidr" {
  description = "IP của bạn để giới hạn SSH (ví dụ: 203.0.113.5/32)"
  type        = string
  # Không đặt default để tránh vô tình mở SSH cho toàn thế giới
}

variable "ssh_public_key_path" {
  default = "/home/ngoch/.ssh/id_ed25519.pub"
}