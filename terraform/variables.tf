variable "vultr_api_key" {
  description = "Vultr API key"
  type        = string
  sensitive   = true
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "region" {
  description = "Vultr region"
  type        = string
  default     = "ewr"
}

variable "plan" {
  description = "Vultr plan (vc2-1c-1gb, vc2-1c-2gb, vc2-2c-4gb)"
  type        = string
  default     = "vc2-1c-1gb"
}

variable "domain" {
  description = "Domain name"
  type        = string
  default     = "webindexer.dev"
}
