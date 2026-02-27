provider "aws" {
  region = var.aws_region
}

module "web_server" {
  source        = "./modules/ec2"
  instance_type = var.instance_type
  key_name      = var.key_name
}

resource "aws_eip" "web_server_eip" {
  instance = module.web_server.instance_id
  domain   = "vpc"
}

output "web_server_public_ip" {
  value = aws_eip.web_server_eip.public_ip
}

