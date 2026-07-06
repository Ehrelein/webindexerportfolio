resource "cloudflare_record" "webindexer" {
  zone_id = data.cloudflare_zone.zone.id
  name    = var.environment
  value   = vultr_instance.webindexer.main_ip
  type    = "A"
  proxied = false
  ttl     = 1
}

resource "cloudflare_record" "www" {
  zone_id = data.cloudflare_zone.zone.id
  name    = "www.${var.environment}"
  value   = vultr_instance.webindexer.main_ip
  type    = "A"
  proxied = false
  ttl     = 1
}

data "cloudflare_zone" "zone" {
  name = var.domain
}

output "public_ip" {
  value = vultr_instance.webindexer.main_ip
}

output "domain" {
  value = "${var.environment}.${var.domain}"
}

output "dashboard_url" {
  value = "http://${var.environment}.${var.domain}:3000"
}

output "search_url" {
  value = "http://${var.environment}.${var.domain}:3000/search"
}

output "api_url" {
  value = "http://${var.environment}.${var.domain}:3000/api"
}

output "metrics_url" {
  value = "http://${var.environment}.${var.domain}:3000/metrics"
}

output "docs_url" {
  value = "http://${var.environment}.${var.domain}:3000/docs"
}
