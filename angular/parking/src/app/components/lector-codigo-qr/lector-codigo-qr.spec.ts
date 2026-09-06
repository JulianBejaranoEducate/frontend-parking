import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LectorCodigoQr } from './lector-codigo-qr';

describe('LectorCodigoQr', () => {
  let component: LectorCodigoQr;
  let fixture: ComponentFixture<LectorCodigoQr>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LectorCodigoQr],
    }).compileComponents();

    fixture = TestBed.createComponent(LectorCodigoQr);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
