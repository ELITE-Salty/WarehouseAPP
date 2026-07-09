import { Component, Input, computed, inject, signal } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppStatus } from '../../core/models/status.models';

@Component({
  selector: 'app-status-label',
  standalone: true,
  template: `
    <span class="status-label" [class]="statusClass()">
      {{ label() }}
    </span>
  `,
})
export class StatusLabelComponent {
  private readonly i18n = inject(I18nService);
  private readonly statusSignal = signal<AppStatus>('DRAFT');

  @Input({ required: true })
  set status(value: AppStatus) {
    this.statusSignal.set(value);
  }

  readonly statusClass = computed(() => {
    return `status-${this.statusSignal().toLowerCase().replaceAll('_', '-')}`;
  });

  readonly label = computed(() => {
    const status = this.statusSignal();

    const statusMap: Record<AppStatus, string> = {
      DRAFT: 'statuses.draft',
      SUBMITTED: 'statuses.submitted',
      ACCEPTED: 'statuses.accepted',
      IN_PROGRESS: 'statuses.inProgress',
      READY_FOR_SIGNATURE: 'statuses.readyForSignature',
      COMPLETED: 'statuses.completed',
      CANCELLED: 'statuses.cancelled',

      OPEN: 'statuses.open',
      EMAILED: 'statuses.emailed',
      RESOLVED: 'statuses.resolved',

      PENDING: 'statuses.pending',
      SENT: 'statuses.sent',
      FAILED: 'statuses.failed',

      CALCULATED: 'statuses.calculated',
      LOCKED: 'statuses.locked',
      INVOICED: 'statuses.invoiced',
      PAID: 'statuses.paid',
    };

    return this.i18n.t(statusMap[status]);
  });
}