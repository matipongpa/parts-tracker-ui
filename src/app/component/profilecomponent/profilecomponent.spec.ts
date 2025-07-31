import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Profilecomponent } from './profilecomponent';

describe('Partlistcomponent', () => {
  let component: Profilecomponent;
  let fixture: ComponentFixture<Profilecomponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Profilecomponent],
    }).compileComponents();

    fixture = TestBed.createComponent(Profilecomponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
