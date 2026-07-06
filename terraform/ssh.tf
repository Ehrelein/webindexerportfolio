variable "ssh_private_key" {
  description = "SSH private key for VPS access"
  type        = string
  sensitive   = true
}
