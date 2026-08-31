import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Accessibility } from './accessibility';

describe('Accessibility', () => {
  let component: Accessibility;
  let fixture: ComponentFixture<Accessibility>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Accessibility],
    }).compileComponents();

    fixture = TestBed.createComponent(Accessibility);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
