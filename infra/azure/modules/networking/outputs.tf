output "vnet_id" {
  value = azurerm_virtual_network.main.id
}

output "vnet_name" {
  value = azurerm_virtual_network.main.name
}

output "subnet_ids" {
  value = {
    aks_nodes         = azurerm_subnet.aks_nodes.id
    postgres          = azurerm_subnet.postgres.id
    private_endpoints = azurerm_subnet.private_endpoints.id
  }
}

output "private_dns_zone_ids" {
  value = {
    for key, zone in azurerm_private_dns_zone.zones : key => zone.id
  }
}
