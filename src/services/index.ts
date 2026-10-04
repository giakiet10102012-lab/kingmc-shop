import { BaseKingService } from './BaseKingService';
import { MoneyService } from './MoneyService';
import { ServiceId } from './types';

export class ServiceRegistry {
  private services: Map<ServiceId, BaseKingService> = new Map();

  constructor() {
    this.register(new MoneyService());
  }

  public register(service: BaseKingService): void {
    this.services.set(service.id, service);
  }

  public getAll(): BaseKingService[] {
    return Array.from(this.services.values());
  }

  public getById(id: ServiceId): BaseKingService | undefined {
    return this.services.get(id);
  }
}

export const serviceRegistry = new ServiceRegistry();

export * from './types';
export * from './BaseKingService';
export * from './MoneyService';
