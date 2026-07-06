resource "vultr_instance" "webindexer" {
  plan_id     = data.vultr_plan.plan.id
  region_id   = data.vultr_region.region.id
  os_id       = data.vultr_os.ubuntu.id
  label       = "webindexer-${var.environment}"
  hostname    = "webindexer.${var.environment}.${var.domain}"
  tags        = ["webindexer", var.environment]
  enable_ipv6 = true

  user_data = templatefile("${path.module}/cloud-init.yml.tpl", {
    environment = var.environment
    domain      = var.domain
  })

  provisioner "remote-exec" {
    inline = [
      "apt-get update",
      "apt-get install -y nodejs npm git",
      "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
      "apt-get install -y nodejs",
      "npm install -g pm2",
    ]

    connection {
      type     = "ssh"
      host     = self.main_ip
      user     = "root"
      private_key = var.ssh_private_key
    }
  }
}

data "vultr_plan" "plan" {
  filter {
    name   = "id"
    values = [var.plan]
  }
}

data "vultr_region" "region" {
  filter {
    name   = "id"
    values = [var.region]
  }
}

data "vultr_os" "ubuntu" {
  filter {
    name   = "name"
    values = ["Ubuntu 22.04 LTS x64"]
  }
}
