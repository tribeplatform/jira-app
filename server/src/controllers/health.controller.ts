import { Controller, Get } from "@nestjs/common";
import { HealthService } from "src/services/health.service";

@Controller("/_health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHello() {
    return this.healthService.checkStatus();
  }
}
