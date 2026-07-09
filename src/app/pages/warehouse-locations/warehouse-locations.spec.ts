import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WarehouseLocations } from './warehouse-locations';

describe('WarehouseLocations', () => {
  let component: WarehouseLocations;
  let fixture: ComponentFixture<WarehouseLocations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WarehouseLocations],
    }).compileComponents();

    fixture = TestBed.createComponent(WarehouseLocations);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
