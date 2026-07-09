import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReferenceData } from './reference-data';

describe('ReferenceData', () => {
  let component: ReferenceData;
  let fixture: ComponentFixture<ReferenceData>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReferenceData],
    }).compileComponents();

    fixture = TestBed.createComponent(ReferenceData);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
