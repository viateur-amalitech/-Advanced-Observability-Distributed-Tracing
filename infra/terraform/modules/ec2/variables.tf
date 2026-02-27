variable "instance_type" {
  description = "EC2 instance type"
  type        = string
}

variable "key_name" {
  description = "Name of the SSH key pair"
  type        = string
}

variable "ami_filter" {
  description = "Filter for selecting AMI"
  type        = string
  default     = "amzn2-ami-hvm-*-x86_64-gp2"
}

variable "sg_name" {
  description = "Security group name"
  type        = string
  default     = "web-app-security-group"
}
